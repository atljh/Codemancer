import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from models.player import AgentStatusResponse
from services.chronicle_service import ChronicleService
from pydantic import BaseModel

router = APIRouter(prefix="/api/game", tags=["game"])

# These will be set from main.py
agent = None
quest_service = None
save_state_fn = lambda: None
chronicle_service: ChronicleService | None = None

# Cached total_files count
_cached_total_files: int = 0
_cached_workspace: str = ""


class FocusStartRequest(BaseModel):
    duration_minutes: int = 25


class FocusStatusResponse(BaseModel):
    active: bool
    started_at: str | None = None
    duration_minutes: int = 0
    remaining_seconds: int = 0


class TrackFileRequest(BaseModel):
    path: str


def _count_project_files(workspace_root: str) -> int:
    """Count files in workspace for total_files metric."""
    global _cached_total_files, _cached_workspace
    if workspace_root == _cached_workspace and _cached_total_files > 0:
        return _cached_total_files
    count = 0
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "target", "dist", "build", ".next"}
    try:
        for dirpath, dirnames, filenames in os.walk(workspace_root):
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]
            count += len(filenames)
            if count > 50000:
                break
    except OSError:
        pass
    _cached_total_files = count
    _cached_workspace = workspace_root
    return count


def get_agent_response(a, workspace_root: str = "") -> AgentStatusResponse:
    total_files = _count_project_files(workspace_root) if workspace_root else 0
    return AgentStatusResponse(
        name=a.name,
        known_files_count=len(set(a.known_files)),
        total_files=total_files,
        total_bytes_processed=a.total_bytes_processed,
        integrity_score=a.integrity_score,
        focus_active=a.focus_active,
    )


def _get_workspace_root() -> str:
    from routes.settings import load_settings
    settings = load_settings()
    return settings.get("workspace_root", "")


def _check_focus_expired():
    """Auto-expire focus if time is up."""
    if not agent or not agent.focus_active or not agent.focus_started_at:
        return
    try:
        started = datetime.fromisoformat(agent.focus_started_at)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        total = agent.focus_duration_minutes * 60
        if elapsed >= total:
            agent.focus_active = False
            agent.focus_started_at = None
            agent.focus_duration_minutes = 0
            save_state_fn()
    except Exception:
        pass


@router.get("/status", response_model=AgentStatusResponse)
async def get_status():
    return get_agent_response(agent, _get_workspace_root())


@router.post("/track_file")
async def track_file(req: TrackFileRequest):
    """Track a file the agent has worked with."""
    if req.path and req.path not in agent.known_files:
        agent.known_files.append(req.path)
        save_state_fn()
    return {"ok": True, "known_files_count": len(set(agent.known_files))}


@router.post("/update_integrity")
async def update_integrity():
    """Update integrity score from health service."""
    try:
        from routes.settings import load_settings
        settings = load_settings()
        workspace_root = settings.get("workspace_root", "")
        if not workspace_root:
            return {"integrity_score": agent.integrity_score}

        from services.health_service import HealthService
        hs = HealthService(workspace_root)
        result = hs.watch()
        scores = result.get("scores", {})
        integrity = (
            scores.get("complexity", 100) * 0.3 +
            scores.get("coverage", 100) * 0.2 +
            scores.get("cleanliness", 100) * 0.3 +
            scores.get("file_size", 100) * 0.2
        )
        agent.integrity_score = round(integrity, 1)
        save_state_fn()
        return {"integrity_score": agent.integrity_score}
    except Exception:
        return {"integrity_score": agent.integrity_score}


@router.post("/reset")
async def reset():
    agent.known_files = []
    agent.total_bytes_processed = 0
    agent.integrity_score = 100.0
    agent.focus_active = False
    agent.focus_started_at = None
    agent.focus_duration_minutes = 0
    save_state_fn()
    return get_agent_response(agent, _get_workspace_root())


# Focus endpoints
@router.post("/focus/start", response_model=FocusStatusResponse)
async def focus_start(req: FocusStartRequest):
    if req.duration_minutes not in (25, 50):
        raise HTTPException(status_code=400, detail="Duration must be 25 or 50")
    agent.focus_active = True
    agent.focus_started_at = datetime.now(timezone.utc).isoformat()
    agent.focus_duration_minutes = req.duration_minutes
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(
            action_type="focus_start",
            description=f"Deep focus started ({req.duration_minutes} min)",
        )

    return _build_focus_status()


@router.post("/focus/end", response_model=FocusStatusResponse)
async def focus_end():
    agent.focus_active = False
    agent.focus_started_at = None
    agent.focus_duration_minutes = 0
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(action_type="focus_end", description="Focus session ended")

    return _build_focus_status()


@router.get("/focus/status", response_model=FocusStatusResponse)
async def focus_status():
    _check_focus_expired()
    return _build_focus_status()


def _build_focus_status() -> FocusStatusResponse:
    if not agent.focus_active or not agent.focus_started_at:
        return FocusStatusResponse(active=False)
    try:
        started = datetime.fromisoformat(agent.focus_started_at)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        total = agent.focus_duration_minutes * 60
        remaining = max(0, int(total - elapsed))
        return FocusStatusResponse(
            active=True,
            started_at=agent.focus_started_at,
            duration_minutes=agent.focus_duration_minutes,
            remaining_seconds=remaining,
        )
    except Exception:
        return FocusStatusResponse(active=False)
