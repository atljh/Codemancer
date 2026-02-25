from pydantic import BaseModel


class SignatureInfo(BaseModel):
    kind: str          # "function" | "class" | "export"
    name: str
    signature: str     # "(params) -> ReturnType" or "(bases)"
    line: int


class SignatureChange(BaseModel):
    kind: str
    name: str
    change_type: str   # "added" | "removed" | "modified"
    old_signature: str | None = None
    new_signature: str | None = None
    line: int | None = None


class SignatureReport(BaseModel):
    file_path: str
    changes: list[SignatureChange] = []
    has_breaking: bool = False     # True if removed/modified
    dependent_count: int = 0       # from blast_radius


class VerificationResult(BaseModel):
    file_path: str
    status: str = "pending"  # "pending" | "pass" | "fail" | "error" | "skipped"
    test_count: int = 0
    passed: int = 0
    failed: int = 0
    error_message: str = ""
    completed_at: str | None = None
