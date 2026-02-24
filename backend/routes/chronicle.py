from fastapi import APIRouter, HTTPException

from models.chronicle import ChronicleEvent, ChronicleSession, ReportRequest, ReportResponse
from services.chronicle_service import ChronicleService
from services.providers import get_provider
from routes.settings import load_settings

router = APIRouter(prefix="/api/chronicle", tags=["chronicle"])

# Injected from main.py
chronicle_service: ChronicleService | None = None

REPORT_PROMPTS = {
    "pr": (
        "Generate a concise Pull Request description from these session events. "
        "Use markdown with ## Summary, ## Changes, ## Files Modified sections. "
        "Be specific about what changed."
    ),
    "standup": (
        "Generate a brief standup update from these session events. "
        "Format: What I did, What I'm doing next, Any blockers. Keep it under 5 bullet points."
    ),
    "jira": (
        "Generate a Jira ticket work log entry from these session events. "
        "Include time spent estimate, description of work done, and files modified."
    ),
}

_MODEL_KEY = {
    "anthropic": "claude_model",
    "openai": "openai_model",
    "gemini": "gemini_model",
    "custom": "custom_model",
}


@router.get("/events", response_model=list[ChronicleEvent])
async def get_events(session_id: str | None = None, limit: int = 50, offset: int = 0):
    if not chronicle_service:
        raise HTTPException(status_code=500, detail="Chronicle service not initialized")
    return chronicle_service.get_events(session_id=session_id, limit=limit, offset=offset)


@router.get("/sessions", response_model=list[ChronicleSession])
async def get_sessions(limit: int = 20):
    if not chronicle_service:
        raise HTTPException(status_code=500, detail="Chronicle service not initialized")
    return chronicle_service.get_sessions(limit=limit)


@router.post("/report", response_model=ReportResponse)
async def generate_report(req: ReportRequest):
    if not chronicle_service:
        raise HTTPException(status_code=500, detail="Chronicle service not initialized")

    summary = chronicle_service.get_session_summary(
        req.session_id or chronicle_service.current_session_id or ""
    )
    if not summary or not summary.get("events"):
        raise HTTPException(status_code=400, detail="No events found for report")

    settings = load_settings()
    try:
        provider = get_provider(settings)
    except Exception:
        raise HTTPException(status_code=400, detail="AI provider not configured")

    provider_name = settings.get("ai_provider", "anthropic")
    model_key = _MODEL_KEY.get(provider_name, "claude_model")
    model = settings.get(model_key, "")
    if not model:
        raise HTTPException(status_code=400, detail="No AI model configured")

    system_prompt = REPORT_PROMPTS.get(req.format, REPORT_PROMPTS["standup"])
    events_text = "\n".join(
        f"- [{e.get('action_type', '?')}] {e.get('description', '')} (files: {', '.join(e.get('files_affected', []))}, +{e.get('exp_gained', 0)} EXP)"
        for e in summary["events"]
    )
    user_msg = f"Session: {summary['started_at']} to {summary.get('ended_at', 'ongoing')}\nTotal actions: {summary['total_actions']}, EXP: {summary['total_exp']}\n\nEvents:\n{events_text}"

    messages = [{"role": "user", "content": user_msg}]
    result = provider.chat(messages, system_prompt, model)

    return ReportResponse(
        content=result["content"],
        format=req.format,
        event_count=len(summary["events"]),
    )
