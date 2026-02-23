import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from anthropic import Anthropic

from models.chat import ChatRequest, ChatResponse
from models.player import Player

router = APIRouter(prefix="/api/chat", tags=["chat"])

player: Player | None = None
quest_service = None

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"

AVAILABLE_MODELS = [
    {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "description": "Fast & capable"},
    {"id": "claude-opus-4-20250514", "name": "Claude Opus 4", "description": "Most powerful"},
    {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "description": "Fast & affordable"},
]

SYSTEM_PROMPT_TEMPLATE = """You are Codemancer — a tactical AI operative embedded in a developer operations terminal.
You help the user write code, debug, and learn programming.
Respond in a helpful, concise manner. You can use markdown for code blocks.

{player_info}
{project_info}"""


def _load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass
    return {}


def _create_client(settings: dict) -> Anthropic:
    auth_method = settings.get("auth_method", "api_key")
    if auth_method == "oauth":
        token = settings.get("oauth_access_token", "")
        if not token:
            raise HTTPException(status_code=400, detail="OAuth token not configured")
        return Anthropic(auth_token=token)
    else:
        api_key = settings.get("anthropic_api_key", "")
        if not api_key:
            raise HTTPException(status_code=400, detail="API key not configured")
        return Anthropic(api_key=api_key)


def _build_system_prompt(project_context: str = "") -> str:
    player_info = ""
    if player:
        player_info = f"Player: {player.name}, Level {player.level}, EXP {player.total_exp}"

    project_info = ""
    if project_context:
        project_info = f"Project context:\n{project_context}"

    return SYSTEM_PROMPT_TEMPLATE.format(
        player_info=player_info,
        project_info=project_info,
    )


@router.post("/send", response_model=ChatResponse)
async def chat_send(req: ChatRequest):
    settings = _load_settings()
    client = _create_client(settings)

    model = settings.get("claude_model", "claude-sonnet-4-20250514")

    system_prompt = _build_system_prompt(req.project_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")]

    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system_prompt,
        messages=messages,
    )

    content = response.content[0].text if response.content else ""
    tokens = (response.usage.input_tokens or 0) + (response.usage.output_tokens or 0)

    return ChatResponse(content=content, model=model, tokens_used=tokens)


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    settings = _load_settings()
    client = _create_client(settings)

    model = settings.get("claude_model", "claude-sonnet-4-20250514")

    system_prompt = _build_system_prompt(req.project_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")]

    async def event_generator():
        with client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"

            final = stream.get_final_message()
            tokens = (final.usage.input_tokens or 0) + (final.usage.output_tokens or 0)
            yield f"data: {json.dumps({'done': True, 'tokens_used': tokens})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/models")
async def get_models():
    return AVAILABLE_MODELS
