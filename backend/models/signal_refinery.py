"""Signal Refinery data models — unified external signal representation."""
from enum import Enum
from pydantic import BaseModel


class UnifiedSignalSource(str, Enum):
    GITHUB = "GITHUB"
    JIRA = "JIRA"
    SLACK = "SLACK"
    TELEGRAM = "TELEGRAM"
    CODE_TODO = "CODE_TODO"
    LSP_ERRORS = "LSP_ERRORS"


class SignalPriority(int, Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    NOISE = 5


class SignalStatus(str, Enum):
    NEW = "new"
    TRIAGED = "triaged"
    LINKED = "linked"
    DISMISSED = "dismissed"


class UnifiedSignal(BaseModel):
    id: str
    source: UnifiedSignalSource
    external_id: str = ""
    title: str = ""
    content: str = ""
    url: str | None = None
    file_path: str | None = None
    line_number: int | None = None
    priority: int = 3
    status: str = "new"
    reason: str | None = None
    provider_metadata: dict = {}
    created_at: str
    updated_at: str
    fetched_at: str
    operation_id: str | None = None


class RefineryProviderStatus(BaseModel):
    name: str
    configured: bool
    enabled: bool
    last_poll: str | None = None
    error_count: int = 0
    last_error: str | None = None


class RefineryStatus(BaseModel):
    providers: dict[str, RefineryProviderStatus] = {}
    total_signals: int = 0
    new_signals: int = 0
    polling_active: bool = False
