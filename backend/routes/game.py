from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from models.player import PlayerResponse
from services.exp_service import ActionType, calculate_exp_with_focus
from services.chronicle_service import ChronicleService
from pydantic import BaseModel

router = APIRouter(prefix="/api/game", tags=["game"])

# These will be set from main.py
player = None
quest_service = None
save_state_fn = lambda: None
chronicle_service: ChronicleService | None = None

class ActionRequest(BaseModel):
    action: ActionType

class ExpGainResponse(BaseModel):
    exp_gained: int
    player: PlayerResponse
    leveled_up: bool
    new_level: int | None = None

class FocusStartRequest(BaseModel):
    duration_minutes: int = 25

class FocusStatusResponse(BaseModel):
    active: bool
    started_at: str | None = None
    duration_minutes: int = 0
    remaining_seconds: int = 0
    exp_multiplier: int = 1

def get_player_response(p) -> PlayerResponse:
    return PlayerResponse(
        name=p.name,
        level=p.level,
        total_exp=p.total_exp,
        exp_progress=p.exp_progress,
        exp_for_next_level=p.exp_for_next_level,
        hp=p.hp,
        max_hp=p.max_hp,
        mp=p.mp,
        max_mp=p.max_mp,
        total_bytes_processed=p.total_bytes_processed,
    )

def _check_focus_expired():
    """Auto-expire focus if time is up."""
    if not player or not player.focus_active or not player.focus_started_at:
        return
    try:
        started = datetime.fromisoformat(player.focus_started_at)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        total = player.focus_duration_minutes * 60
        if elapsed >= total:
            player.focus_active = False
            player.focus_started_at = None
            player.focus_duration_minutes = 0
            save_state_fn()
    except Exception:
        pass

@router.get("/status", response_model=PlayerResponse)
async def get_status():
    return get_player_response(player)

@router.post("/action", response_model=ExpGainResponse)
async def perform_action(req: ActionRequest):
    # MP cost for message action
    MP_COSTS: dict[str, int] = {"message": 5}
    cost = MP_COSTS.get(req.action.value, 0)
    if cost > 0 and player.mp < cost:
        raise HTTPException(status_code=400, detail="Not enough MP")
    if cost > 0:
        player.mp -= cost

    _check_focus_expired()
    old_level = player.level
    exp = calculate_exp_with_focus(req.action, player)
    player.total_exp += exp
    new_level = player.level
    leveled_up = new_level > old_level
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(
            action_type=req.action.value,
            description=f"Action: {req.action.value}",
            exp_gained=exp,
        )

    return ExpGainResponse(
        exp_gained=exp,
        player=get_player_response(player),
        leveled_up=leveled_up,
        new_level=new_level if leveled_up else None,
    )

@router.post("/reset")
async def reset():
    player.total_exp = 0
    player.hp = player.max_hp
    player.mp = player.max_mp
    player.focus_active = False
    player.focus_started_at = None
    player.focus_duration_minutes = 0
    save_state_fn()
    return get_player_response(player)

# Focus endpoints
@router.post("/focus/start", response_model=FocusStatusResponse)
async def focus_start(req: FocusStartRequest):
    if req.duration_minutes not in (25, 50):
        raise HTTPException(status_code=400, detail="Duration must be 25 or 50")
    player.focus_active = True
    player.focus_started_at = datetime.now(timezone.utc).isoformat()
    player.focus_duration_minutes = req.duration_minutes
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(
            action_type="focus_start",
            description=f"Deep focus started ({req.duration_minutes} min)",
        )

    return _build_focus_status()

@router.post("/focus/end", response_model=FocusStatusResponse)
async def focus_end():
    player.focus_active = False
    player.focus_started_at = None
    player.focus_duration_minutes = 0
    save_state_fn()

    if chronicle_service:
        chronicle_service.log_event(action_type="focus_end", description="Focus session ended")

    return _build_focus_status()

@router.get("/focus/status", response_model=FocusStatusResponse)
async def focus_status():
    _check_focus_expired()
    return _build_focus_status()

def _build_focus_status() -> FocusStatusResponse:
    if not player.focus_active or not player.focus_started_at:
        return FocusStatusResponse(active=False)
    try:
        started = datetime.fromisoformat(player.focus_started_at)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
        total = player.focus_duration_minutes * 60
        remaining = max(0, int(total - elapsed))
        return FocusStatusResponse(
            active=True,
            started_at=player.focus_started_at,
            duration_minutes=player.focus_duration_minutes,
            remaining_seconds=remaining,
            exp_multiplier=2,
        )
    except Exception:
        return FocusStatusResponse(active=False)
