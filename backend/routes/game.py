from fastapi import APIRouter, HTTPException
from models.player import PlayerResponse
from services.exp_service import ActionType, calculate_exp
from pydantic import BaseModel

router = APIRouter(prefix="/api/game", tags=["game"])

# These will be set from main.py
player = None
quest_service = None

class ActionRequest(BaseModel):
    action: ActionType

class ExpGainResponse(BaseModel):
    exp_gained: int
    player: PlayerResponse
    leveled_up: bool
    new_level: int | None = None

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
    )

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

    old_level = player.level
    exp = calculate_exp(req.action)
    player.total_exp += exp
    new_level = player.level
    leveled_up = new_level > old_level
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
    return get_player_response(player)
