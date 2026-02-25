from pydantic import BaseModel
from enum import Enum


class SignalSource(str, Enum):
    TELEGRAM = "TELEGRAM"
    CODE_TODO = "CODE_TODO"
    LSP_ERRORS = "LSP_ERRORS"


class OperationStatus(str, Enum):
    ANALYSIS = "ANALYSIS"
    DEPLOYING = "DEPLOYING"
    TESTING = "TESTING"
    COMPLETED = "COMPLETED"


class Signal(BaseModel):
    id: str
    source: SignalSource
    content: str
    file_path: str | None = None
    line_number: int | None = None
    timestamp: str
    metadata: dict = {}


class Operation(BaseModel):
    id: str
    title: str
    description: str
    status: OperationStatus = OperationStatus.ANALYSIS
    signals: list[Signal] = []
    related_sectors: list[str] = []
    created_at: str
    updated_at: str
    children: list[str] = []
    parent_id: str | None = None


class OperationCreate(BaseModel):
    title: str
    description: str = ""
    related_sectors: list[str] = []
    status: OperationStatus = OperationStatus.ANALYSIS


class OperationUpdate(BaseModel):
    status: OperationStatus | None = None
    title: str | None = None
    description: str | None = None


class ScanResult(BaseModel):
    signals: list[Signal]
    operations_created: int
    total_signals: int
