from pydantic import BaseModel


class ComplexFunction(BaseModel):
    file: str
    name: str
    lines: int
    start_line: int


class CodeAnomaly(BaseModel):
    file: str
    line: int
    tag: str  # TODO, FIXME, HACK, XXX, BUG
    text: str


class LargeFile(BaseModel):
    file: str
    lines: int


class HealthScores(BaseModel):
    complexity: int = 100  # 0-100
    coverage: int = 100
    cleanliness: int = 100
    file_size: int = 100


class HealthScanResponse(BaseModel):
    scores: HealthScores
    complex_functions: list[ComplexFunction] = []
    untested_files: list[str] = []
    anomalies: list[CodeAnomaly] = []
    large_files: list[LargeFile] = []


class CriticalAnomaly(BaseModel):
    severity: str  # "critical" | "warning"
    category: str  # "file_size" | "complexity" | "coverage" | "cleanliness"
    sector: str  # affected directory/area
    message: str
    details: list[str] = []


class HealthWatchResponse(BaseModel):
    has_critical: bool = False
    anomalies: list[CriticalAnomaly] = []
    scores: HealthScores = HealthScores()
