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
