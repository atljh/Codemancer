"""Pydantic models for the Agentic Supervisor system."""
from enum import Enum
from datetime import datetime, timezone

from pydantic import BaseModel, Field


class PlanStepType(str, Enum):
    read_file = "read_file"
    write_file = "write_file"
    list_files = "list_files"
    search_text = "search_text"
    run_command = "run_command"


class PlanStepStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"
    simulated = "simulated"


class PlanStatus(str, Enum):
    proposed = "proposed"
    approved = "approved"
    executing = "executing"
    completed = "completed"
    failed = "failed"
    dismissed = "dismissed"


class PlanStep(BaseModel):
    index: int
    tool: PlanStepType
    description: str
    input: dict = Field(default_factory=dict)
    status: PlanStepStatus = PlanStepStatus.pending
    result_summary: str | None = None
    old_content: str | None = None
    new_content: str | None = None
    file_path: str | None = None


class ActionPlan(BaseModel):
    id: str
    signal_id: str
    signal_title: str
    signal_reason: str | None = None
    steps: list[PlanStep] = Field(default_factory=list)
    status: PlanStatus = PlanStatus.proposed
    sandbox_mode: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    affected_files: list[str] = Field(default_factory=list)
    execution_log: list[str] = Field(default_factory=list)
