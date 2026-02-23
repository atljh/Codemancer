import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.chat import ChatRequest, ChatResponse
from models.player import Player
from services.providers import get_provider

router = APIRouter(prefix="/api/chat", tags=["chat"])

player: Player | None = None
quest_service = None

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"

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
{project_info}"""


def _load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except Exception:
            pass
    return {}


def _get_model(settings: dict) -> str:
    provider = settings.get("ai_provider", "anthropic")
    key = _MODEL_KEY.get(provider, "claude_model")
    defaults = {"claude_model": "claude-sonnet-4-20250514", "openai_model": "gpt-4o", "gemini_model": "gemini-2.0-flash", "custom_model": ""}
    return settings.get(key, defaults.get(key, ""))


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
    system_prompt = _build_system_prompt(req.project_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages if m.role in ("user", "assistant")]

    async def event_generator():
        for chunk in provider.chat_stream(messages, system_prompt, model):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/models")
async def get_models(provider: str | None = None):
    if provider and provider in PROVIDER_MODELS:
        return PROVIDER_MODELS[provider]
    # Default: return models for all providers
    return PROVIDER_MODELS
