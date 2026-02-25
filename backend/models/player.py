from pydantic import BaseModel


class AgentStatus(BaseModel):
    name: str = "Codemancer"
    known_files: list[str] = []
    total_bytes_processed: int = 0
    integrity_score: float = 100.0
    focus_active: bool = False
    focus_started_at: str | None = None
    focus_duration_minutes: int = 0


class AgentStatusResponse(BaseModel):
    name: str
    known_files_count: int
    total_files: int
    total_bytes_processed: int
    integrity_score: float
    focus_active: bool
