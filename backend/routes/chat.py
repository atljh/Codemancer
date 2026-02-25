import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from models.chat import ChatRequest, ChatResponse, ImageData
from models.player import AgentStatus
from services.providers import get_provider
from services.tools import ToolExecutor
from services.tool_schemas import get_anthropic_tools, get_openai_tools
from services.file_service import FileService
from routes.settings import load_settings as _load_settings_from_file

from services.chronicle_service import ChronicleService
from services.dependency_service import DependencyService

router = APIRouter(prefix="/api/chat", tags=["chat"])

agent: AgentStatus | None = None
quest_service = None
file_service: FileService | None = None
save_state_fn = None
chronicle_service: ChronicleService | None = None

PROVIDER_MODELS = {
    "anthropic": [
        {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "description": "Fast & capable"},
        {"id": "claude-opus-4-20250514", "name": "Claude Opus 4", "description": "Most powerful"},
        {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "description": "Fast & affordable"},
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o", "description": "Fast & capable"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "Fast & affordable"},
        {"id": "o3-mini", "name": "o3-mini", "description": "Reasoning model"},
    ],
    "gemini": [
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "description": "Fast & capable"},
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Most powerful"},
    ],
    "custom": [],
}

# Map provider -> settings key for the selected model
_MODEL_KEY = {
    "anthropic": "claude_model",
    "openai": "openai_model",
    "gemini": "gemini_model",
    "custom": "custom_model",
}

SYSTEM_PROMPT_TEMPLATE = """You are Codemancer — a tactical AI operative embedded in a developer operations terminal.
You address the user as "Operator" (or "Оператор" if responding in Russian).

Your communication style is analytical and precise:
- Instead of "I fixed the bug" say "Patch applied. Sector stability restored to estimated 98%."
- Instead of "Here's the code" say "Deploying solution. Probability of successful integration: high."
- Instead of "There's an error" say "Anomaly detected in sector. Threat level: moderate. Initiating analysis."
- Use tactical/military metaphors: sectors, operations, deployments, anomalies, threat levels.
- Be concise. Quantify when possible. Report status with confidence percentages.

You help the Operator write code, debug, and learn programming.
Use markdown for code blocks. Keep responses focused and actionable.

{agent_info}
{project_info}
{tools_info}"""


def _load_settings() -> dict:
    return _load_settings_from_file()


def _get_model(settings: dict) -> str:
    provider = settings.get("ai_provider", "anthropic")
    key = _MODEL_KEY.get(provider, "claude_model")
    defaults = {"claude_model": "claude-sonnet-4-20250514", "openai_model": "gpt-4o", "gemini_model": "gemini-2.0-flash", "custom_model": ""}
    return settings.get(key, defaults.get(key, ""))


def _build_system_prompt(project_context: str = "", has_tools: bool = False) -> str:
    agent_info = ""
    if agent:
        agent_info = f"Agent: {agent.name}, Integrity: {agent.integrity_score}%"

    project_info = ""
    if project_context:
        project_info = f"Project context:\n{project_context}"

    tools_info = ""
    if has_tools:
        tools_info = """You have access to tools for interacting with the user's project files:
- list_files: Explore directory structure
- read_file: Read file contents
- write_file: Create or modify files
- search_text: Search for patterns in code
- run_command: Run shell commands (npm test, pytest, cargo build, linters, etc.)

IMPORTANT: Always use tools to get accurate information. Do NOT guess file contents or project structure — use list_files and read_file to verify.
When the user asks about the project, use list_files first to see the actual structure.
When modifying files, always read the file first, then write the complete updated content.
Paths can be relative to the project root or absolute.

When a run_command fails (tests, build, lint), analyze the output and propose a concrete repair plan.
If you wrote code that caused a test failure, fix it immediately."""

    return SYSTEM_PROMPT_TEMPLATE.format(
        agent_info=agent_info,
        project_info=project_info,
        tools_info=tools_info,
    )


def _format_messages(messages_in: list, provider_name: str) -> list[dict]:
    """Format ChatMessageIn list to provider-specific dicts, handling images."""
    result = []
    for m in messages_in:
        if m.role not in ("user", "assistant"):
            continue
        images: list[ImageData] = getattr(m, "images", []) or []
        if not images or m.role != "user":
            result.append({"role": m.role, "content": m.content})
            continue

        if provider_name == "anthropic":
            content: list[dict] = []
            for img in images:
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": img.media_type, "data": img.data},
                })
            if m.content:
                content.append({"type": "text", "text": m.content})
            result.append({"role": "user", "content": content})

        elif provider_name == "openai":
            content = []
            for img in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{img.media_type};base64,{img.data}"},
                })
            if m.content:
                content.append({"type": "text", "text": m.content})
            result.append({"role": "user", "content": content})

        elif provider_name == "gemini":
            result.append({
                "role": "user",
                "content": m.content,
                "_images": [{"media_type": img.media_type, "data": img.data} for img in images],
            })

        else:
            result.append({"role": m.role, "content": m.content})

    return result


def _get_tools_for_provider(provider_name: str) -> list[dict] | None:
    """Get tool definitions in the right format for the provider. Returns None if tools not supported."""
    if provider_name == "anthropic":
        return get_anthropic_tools()
    elif provider_name == "openai":
        return get_openai_tools()
    # Gemini and custom providers: no tool support yet
    return None


@router.post("/send", response_model=ChatResponse)
async def chat_send(req: ChatRequest):
    settings = _load_settings()

    try:
        provider = get_provider(settings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    model = _get_model(settings)
    provider_name = settings.get("ai_provider", "anthropic")
    system_prompt = _build_system_prompt(req.project_context)
    messages = _format_messages(req.messages, provider_name)

    result = provider.chat(messages, system_prompt, model)

    return ChatResponse(content=result["content"], model=model, tokens_used=result["tokens_used"])


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    settings = _load_settings()

    try:
        provider = get_provider(settings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    model = _get_model(settings)
    provider_name = settings.get("ai_provider", "anthropic")

    # Determine if tools are available
    workspace_root = settings.get("workspace_root", "")
    tools = _get_tools_for_provider(provider_name) if workspace_root else None
    has_tools = tools is not None and len(tools) > 0

    system_prompt = _build_system_prompt(req.project_context, has_tools=has_tools)
    messages = _format_messages(req.messages, provider_name)

    # Create tool executor if tools available
    tool_executor = None
    if has_tools and file_service:
        fs = FileService(workspace_root=workspace_root)
        tool_executor = ToolExecutor(fs)

    async def event_generator():
        nonlocal messages
        total_tokens = 0
        total_bytes_processed = 0
        max_iterations = 10

        try:
            for iteration in range(max_iterations):
                # Choose streaming method based on tools availability
                if tools and tool_executor:
                    formatted_messages = provider.format_messages_with_tool_results(messages)
                    stream = provider.chat_stream_with_tools(formatted_messages, system_prompt, model, tools)
                else:
                    stream = provider.chat_stream(messages, system_prompt, model)

                # Collect text and tool calls from this iteration
                text_chunks: list[str] = []
                tool_calls: list[dict] = []
                stop_reason = "end_turn"

                for chunk in stream:
                    if chunk.get("done"):
                        total_tokens += chunk.get("tokens_used", 0)
                        stop_reason = chunk.get("stop_reason", "end_turn")
                        break
                    elif chunk.get("type") == "tool_use":
                        tool_calls.append(chunk)
                    elif chunk.get("text"):
                        text_chunks.append(chunk["text"])
                        yield f"data: {json.dumps({'type': 'text', 'text': chunk['text']})}\n\n"

                # If no tool calls, we're done
                if stop_reason != "tool_use" or not tool_calls or not tool_executor:
                    break

                # Process tool calls
                assistant_content: list[dict] = []
                if text_chunks:
                    assistant_content.append({"type": "text", "text": "".join(text_chunks)})
                for tc in tool_calls:
                    assistant_content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    })

                # Add assistant message with tool use blocks
                messages.append({"role": "assistant", "content": assistant_content})

                # Execute tools and build tool result blocks
                tool_result_blocks: list[dict] = []
                for tc in tool_calls:
                    # Send tool_call event to frontend
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool_id': tc['id'], 'tool_name': tc['name'], 'input': tc['input']})}\n\n"

                    # Execute
                    result = tool_executor.execute(tc["name"], tc["id"], tc["input"])

                    # Update agent stats
                    if agent:
                        agent.total_bytes_processed += result.bytes_processed
                        if result.file_path and result.file_path not in agent.known_files:
                            agent.known_files.append(result.file_path)
                        if save_state_fn:
                            save_state_fn()

                    total_bytes_processed += result.bytes_processed

                    if chronicle_service:
                        chronicle_service.log_event(
                            action_type=f"tool_{result.tool_name}",
                            description=result.summary[:120] if result.summary else f"Tool: {result.tool_name}",
                            files_affected=[result.file_path] if result.file_path else [],
                        )

                    # Send tool_result event to frontend
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool_id': result.tool_id, 'tool_name': result.tool_name, 'status': result.status, 'summary': result.summary, 'bytes_processed': result.bytes_processed})}\n\n"

                    # Send command_result for run_command with output
                    if result.tool_name == "run_command":
                        yield f"data: {json.dumps({'type': 'command_result', 'tool_id': result.tool_id, 'command': tc['input'].get('command', ''), 'exit_code': result.exit_code, 'output': result.content[:3000], 'status': result.status})}\n\n"

                    # Send tool_diff for write operations
                    if result.tool_name == "write_file" and result.old_content is not None and result.new_content is not None:
                        yield f"data: {json.dumps({'type': 'tool_diff', 'tool_id': result.tool_id, 'file_path': result.file_path or '', 'file_name': Path(result.file_path).name if result.file_path else '', 'old_content': result.old_content, 'new_content': result.new_content})}\n\n"

                        # Pre-Commit Scan: compute blast radius
                        if workspace_root and result.file_path:
                            try:
                                dep_svc = DependencyService(workspace_root)
                                file_rel = str(Path(result.file_path).relative_to(workspace_root))
                                br = dep_svc.blast_radius(file_rel)
                                if br["count"] > 0:
                                    yield f"data: {json.dumps({'type': 'blast_radius', 'file': br['file'], 'dependents': br['dependents'], 'count': br['count'], 'high': br['high']})}\n\n"
                            except Exception:
                                pass

                    # Build tool result block for LLM context
                    tool_result_blocks.append({
                        "type": "tool_result",
                        "tool_use_id": tc["id"],
                        "content": result.content,
                    })

                # Add user message with tool results
                messages.append({"role": "user", "content": tool_result_blocks})

        except Exception as e:
            error_msg = str(e)
            # Extract useful message from provider errors
            if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
                error_msg = "API quota exceeded. Check your plan and billing at your provider's dashboard."
            elif "401" in error_msg or "Unauthorized" in error_msg:
                error_msg = "Invalid API key. Check your credentials in Settings."
            elif len(error_msg) > 200:
                error_msg = error_msg[:200] + "..."
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

        # Send done event
        yield f"data: {json.dumps({'done': True, 'tokens_used': total_tokens, 'total_bytes_processed': total_bytes_processed})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


INTELLIGENCE_PROMPT = """You are a tactical intelligence processor. The Operator has submitted raw input (voice or text).
Your job:
1. Formulate a clear **intent** — what the Operator actually wants accomplished (1-2 sentences).
2. Break it into **subtasks** — concrete steps an AI agent can execute (3-7 items).
3. If the input is ambiguous, add a **clarifying_question** that you'd need answered before proceeding.

Respond ONLY in valid JSON with this shape:
{
  "intent": "string",
  "subtasks": ["string", ...],
  "clarifying_question": "string or null"
}

Be specific. Convert vague ideas into actionable items. Use the project context if provided.
If the input is in Russian, respond in Russian. If in English, respond in English."""


class IntelligenceRequest(BaseModel):
    raw_input: str
    source: str = "text"  # "voice" | "text"
    project_context: str = ""


class IntelligenceResponse(BaseModel):
    intent: str
    subtasks: list[str] = []
    clarifying_question: str | None = None


@router.post("/process_intelligence", response_model=IntelligenceResponse)
async def process_intelligence(req: IntelligenceRequest):
    settings = _load_settings()

    try:
        provider = get_provider(settings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    model = _get_model(settings)

    user_msg = f"Raw input ({req.source}): {req.raw_input}"
    if req.project_context:
        user_msg += f"\n\nProject context:\n{req.project_context}"

    messages = [{"role": "user", "content": user_msg}]
    result = provider.chat(messages, INTELLIGENCE_PROMPT, model)

    content = result.get("content", "")
    # Parse JSON from response
    try:
        # Strip markdown code fences if present
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
        return IntelligenceResponse(
            intent=parsed.get("intent", req.raw_input),
            subtasks=parsed.get("subtasks", []),
            clarifying_question=parsed.get("clarifying_question"),
        )
    except (json.JSONDecodeError, KeyError):
        # Fallback: use raw content as intent
        return IntelligenceResponse(intent=content[:500], subtasks=[])


@router.get("/models")
async def get_models(provider: str | None = None):
    if provider and provider in PROVIDER_MODELS:
        return PROVIDER_MODELS[provider]
    # Default: return models for all providers
    return PROVIDER_MODELS
