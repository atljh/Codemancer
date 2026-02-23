from pydantic import BaseModel
from enum import Enum

class QuestStatus(str, Enum):
    active = "active"
    completed = "completed"
    failed = "failed"

class Quest(BaseModel):
    id: str
    title: str
    description: str = ""
    exp_reward: int = 50
    status: QuestStatus = QuestStatus.active
    source_file: str | None = None
    line_number: int | None = None

class QuestCreate(BaseModel):
    title: str
    description: str = ""
    exp_reward: int = 50
