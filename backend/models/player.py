from pydantic import BaseModel
import math

class Player(BaseModel):
    name: str = "Codemancer"
    total_exp: int = 0
    hp: int = 100
    max_hp: int = 100
    mp: int = 50
    max_mp: int = 50
    total_bytes_processed: int = 0
    focus_active: bool = False
    focus_started_at: str | None = None
    focus_duration_minutes: int = 0

    @property
    def level(self) -> int:
        return int(math.floor(math.sqrt(self.total_exp / 100)))

    @property
    def exp_for_current_level(self) -> int:
        return self.level ** 2 * 100

    @property
    def exp_for_next_level(self) -> int:
        return (self.level + 1) ** 2 * 100

    @property
    def exp_progress(self) -> float:
        current = self.exp_for_current_level
        next_lvl = self.exp_for_next_level
        if next_lvl == current:
            return 0.0
        return (self.total_exp - current) / (next_lvl - current)

class PlayerResponse(BaseModel):
    name: str
    level: int
    total_exp: int
    exp_progress: float
    exp_for_next_level: int
    hp: int
    max_hp: int
    mp: int
    max_mp: int
    total_bytes_processed: int
