from pydantic import BaseModel


class ChronicleEvent(BaseModel):
    id: int = 0
    timestamp: str = ""
    action_type: str = ""
    description: str = ""
    files_affected: list[str] = []
    exp_gained: int = 0
    session_id: str = ""


class ChronicleSession(BaseModel):
    id: str = ""
    started_at: str = ""
    ended_at: str | None = None
    total_exp: int = 0
    total_actions: int = 0


class ReportRequest(BaseModel):
    session_id: str | None = None
    format: str = "standup"  # "pr" | "standup" | "jira"


class ReportResponse(BaseModel):
    content: str = ""
    format: str = ""
    event_count: int = 0


class RecallMatch(BaseModel):
    session_id: str
    session_date: str
    files: list[str] = []
    actions: list[str] = []
    total_events: int = 0


class RecallRequest(BaseModel):
    message: str


class RecallResponse(BaseModel):
    has_recall: bool = False
    matches: list[RecallMatch] = []


# ── Intel Logs ─────────────────────────────────────────

class IntelLog(BaseModel):
    id: int = 0
    timestamp: str = ""
    source: str = "text"  # "voice" | "text" | "proactive"
    raw_input: str = ""
    intent: str = ""
    subtasks: list[str] = []
    status: str = "pending"  # "pending" | "active" | "done" | "archived"
    exp_multiplier: float = 1.0
    session_id: str = ""


class IntelLogCreate(BaseModel):
    source: str = "text"
    raw_input: str
    intent: str = ""
    subtasks: list[str] = []
    exp_multiplier: float = 1.0
