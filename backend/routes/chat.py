import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.chat import ChatRequest, ChatResponse
from models.player import Player
from services.providers import get_provider
from services.tools import ToolExecutor
from services.tool_schemas import get_anthropic_tools, get_openai_tools
from services.file_service import FileService
from routes.settings import load_settings as _load_settings_from_file

router = APIRouter(prefix="/api/chat", tags=["chat"])

player: Player | None = None
quest_service = None
file_service: FileService | None = None
save_state_fn = None

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
You help the user write code, debug, and learn programming.
Respond in a helpful, concise manner. You can use markdown for code blocks.

{player_info}
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
    player_info = ""
    if player:
        player_info = f"Player: {player.name}, Level {player.level}, EXP {player.total_exp}"

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

Use these tools when the user asks you to read, write, modify, search, or explore files.
When modifying files, always read the file first to understand its current content, then write the complete updated content."""

    return SYSTEM_PROMPT_TEMPLATE.format(
        player_info=player_info,
        project_info=project_info,
        tools_info=tools_info,
    )


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
    system_prompt = _build_system_prompt(req.project_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")]

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
    messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")]

    # Create tool executor if tools available
    tool_executor = None
    if has_tools and file_service:
        fs = FileService(workspace_root=workspace_root)
        tool_executor = ToolExecutor(fs)

    async def event_generator():
        nonlocal messages
        total_tokens = 0
        total_bytes_processed = 0
        total_exp_from_tools = 0
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

                    # Update player stats
                    if player:
                        player.mp = max(0, player.mp - result.mp_cost)
                        player.total_exp += result.exp_gained
                        player.total_bytes_processed += result.bytes_processed
                        if save_state_fn:
                            save_state_fn()

                    total_bytes_processed += result.bytes_processed
                    total_exp_from_tools += result.exp_gained

                    # Send tool_result event to frontend
                    yield f"data: {json.dumps({'type': 'tool_result', 'tool_id': result.tool_id, 'tool_name': result.tool_name, 'status': result.status, 'summary': result.summary, 'exp_gained': result.exp_gained, 'mp_cost': result.mp_cost, 'bytes_processed': result.bytes_processed})}\n\n"

                    # Send tool_diff for write operations
                    if result.tool_name == "write_file" and result.old_content is not None and result.new_content is not None:
                        yield f"data: {json.dumps({'type': 'tool_diff', 'tool_id': result.tool_id, 'file_path': result.file_path or '', 'file_name': Path(result.file_path).name if result.file_path else '', 'old_content': result.old_content, 'new_content': result.new_content, 'exp_gained': result.exp_gained})}\n\n"

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
        yield f"data: {json.dumps({'done': True, 'tokens_used': total_tokens, 'total_bytes_processed': total_bytes_processed, 'total_exp_from_tools': total_exp_from_tools})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/models")
async def get_models(provider: str | None = None):
    if provider and provider in PROVIDER_MODELS:
        return PROVIDER_MODELS[provider]
    # Default: return models for all providers
    return PROVIDER_MODELS
