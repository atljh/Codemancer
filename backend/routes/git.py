from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.player import AgentStatus
from models.git import (
    GitStatusResponse,
    GitBranchesResponse,
    GitPathsRequest,
    GitCommitRequest,
    GitCommitResponse,
)
from services.git_service import GitService
from services.chronicle_service import ChronicleService
from services.providers import get_provider
from routes.settings import load_settings

router = APIRouter(prefix="/api/git", tags=["git"])

# Injected from main.py lifespan
agent: AgentStatus = AgentStatus()
save_state_fn = lambda: None
chronicle_service: ChronicleService | None = None


def _get_service() -> GitService:
    settings = load_settings()
    cwd = settings.get("workspace_root", "")
    if not cwd:
        raise HTTPException(status_code=400, detail="No workspace configured")
    if not Path(cwd).is_dir():
        raise HTTPException(status_code=400, detail="Workspace directory not found")
    svc = GitService(cwd)
    if not svc.is_git_repo():
        raise HTTPException(status_code=400, detail="Not a git repository")
    return svc


@router.get("/status", response_model=GitStatusResponse)
async def git_status():
    return _get_service().status()


@router.get("/branches", response_model=GitBranchesResponse)
async def git_branches():
    return _get_service().branches()


@router.post("/stage")
async def git_stage(req: GitPathsRequest):
    _get_service().stage(req.paths)
    return {"ok": True}


@router.post("/unstage")
async def git_unstage(req: GitPathsRequest):
    _get_service().unstage(req.paths)
    return {"ok": True}


@router.post("/commit", response_model=GitCommitResponse)
async def git_commit(req: GitCommitRequest):
    svc = _get_service()
    result = svc.commit(req.message)
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(
            action_type="git_commit",
            description=f"Commit: {req.message[:80]}",
        )

    return result


@router.post("/discard")
async def git_discard(req: GitPathsRequest):
    _get_service().discard(req.paths)
    return {"ok": True}


class GenerateMessageResponse(BaseModel):
    message: str


_MODEL_KEY = {
    "anthropic": "claude_model",
    "openai": "openai_model",
    "gemini": "gemini_model",
    "custom": "custom_model",
}

COMMIT_SYSTEM_PROMPT = (
    "Generate a concise conventional commit message for the following diff. "
    "Reply with ONLY the commit message, no quotes, no explanation."
)


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_commit_message():
    svc = _get_service()
    diff = svc.staged_diff()
    if not diff.strip():
        raise HTTPException(status_code=400, detail="No staged changes")

    settings = load_settings()
    provider_name = settings.get("ai_provider", "anthropic")
    model_key = _MODEL_KEY.get(provider_name, "claude_model")
    model = settings.get(model_key, "")
    if not model:
        raise HTTPException(status_code=400, detail="No AI model configured")

    try:
        provider = get_provider(settings)
    except Exception:
        raise HTTPException(status_code=400, detail="AI provider not configured")

    # Truncate diff to avoid exceeding token limits
    max_diff_len = 8000
    truncated = diff[:max_diff_len]
    if len(diff) > max_diff_len:
        truncated += "\n... (diff truncated)"

    messages = [{"role": "user", "content": truncated}]
    result = provider.chat(messages, COMMIT_SYSTEM_PROMPT, model)
    return GenerateMessageResponse(message=result["content"].strip())
