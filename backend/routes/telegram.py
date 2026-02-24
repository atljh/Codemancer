import json

from fastapi import APIRouter, HTTPException

from models.telegram import TelegramAnalyzeRequest, TelegramAnalyzeResponse, TelegramQuestRequest
from models.quest import QuestCreate
from services.providers import get_provider
from routes.settings import load_settings as _load_settings

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

quest_service = None

ANALYZE_PROMPT = """You are an AI assistant that analyzes Telegram messages in the context of a software project.
Given a message and a list of project files, determine:
1. Whether the message references any project files or code areas (has_references: bool)
2. Which specific files are likely related (linked_files: list of file paths from the provided list)
3. A brief summary of the message (summary: string)
4. If the message implies a task/bug/feature request, suggest a quest title (quest_suggestion: string or null)

Respond ONLY with valid JSON:
{"has_references": bool, "linked_files": [...], "summary": "...", "quest_suggestion": "..." or null}"""


def _get_model(settings: dict) -> str:
    provider_name = settings.get("ai_provider", "anthropic")
    if provider_name == "anthropic":
        return settings.get("claude_model", "claude-sonnet-4-20250514")
    elif provider_name == "openai":
        return settings.get("openai_model", "gpt-4o")
    elif provider_name == "gemini":
        return settings.get("gemini_model", "gemini-2.0-flash")
    elif provider_name == "custom":
        return settings.get("custom_model", "")
    return "claude-sonnet-4-20250514"


@router.post("/analyze", response_model=TelegramAnalyzeResponse)
async def analyze_message(req: TelegramAnalyzeRequest):
    settings = _load_settings()

    try:
        provider = get_provider(settings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    model = _get_model(settings)

    user_msg = f"Message from {req.sender_name}: {req.message_text}"
    if req.project_files:
        user_msg += f"\n\nProject files:\n" + "\n".join(req.project_files)
    if req.project_context:
        user_msg += f"\n\nProject context:\n{req.project_context}"

    messages = [{"role": "user", "content": user_msg}]
    result = provider.chat(messages, ANALYZE_PROMPT, model)

    content = result.get("content", "")
    try:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
        return TelegramAnalyzeResponse(
            has_references=parsed.get("has_references", False),
            linked_files=parsed.get("linked_files", []),
            summary=parsed.get("summary", ""),
            quest_suggestion=parsed.get("quest_suggestion"),
        )
    except (json.JSONDecodeError, KeyError):
        return TelegramAnalyzeResponse(summary=content[:500])


@router.post("/extract_quest")
async def extract_quest(req: TelegramQuestRequest):
    if quest_service is None:
        raise HTTPException(status_code=500, detail="Quest service not initialized")

    title = req.quest_title or f"Signal from {req.sender_name}: {req.message_text[:60]}"
    description = req.message_text
    if req.linked_files:
        description += f"\n\nLinked files: {', '.join(req.linked_files)}"

    quest = quest_service.create(QuestCreate(
        title=title,
        description=description,
        exp_reward=50,
        source_file=req.linked_files[0] if req.linked_files else None,
    ))
    return quest
