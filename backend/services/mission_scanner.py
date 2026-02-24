"""
Data Aggregation Scanner for MissionControl.
Collects signals from three sources:
  [CODE_TODO]  — TODO/FIXME comments in the codebase
  [TELEGRAM]   — Messages marked as important
  [LSP_ERRORS] — Critical compilation errors
"""
import re
import uuid
from pathlib import Path
from datetime import datetime, timezone

from models.mission import Signal, SignalSource

TODO_PATTERN = re.compile(
    r"(?:#|//)\s*(?:TODO|FIXME|BUG|HACK|XXX)[:\s]+(.+)", re.IGNORECASE
)

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", "target", ".venv",
    "venv", "dist", ".next", ".claude", "build", ".svelte-kit",
}

SOURCE_EXTENSIONS = (
    ".py", ".ts", ".tsx", ".js", ".jsx", ".rs", ".go",
    ".java", ".rb", ".vue", ".svelte", ".css", ".scss",
)


def scan_code_todos(directory: str) -> list[Signal]:
    """Scan directory tree for TODO/FIXME/BUG markers."""
    signals: list[Signal] = []
    root = Path(directory)
    if not root.exists():
        return signals

    now = datetime.now(timezone.utc).isoformat()

    for ext in SOURCE_EXTENSIONS:
        for file_path in root.rglob(f"*{ext}"):
            # Skip ignored directories
            parts = file_path.relative_to(root).parts
            if any(p in SKIP_DIRS for p in parts):
                continue
            try:
                lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
            except Exception:
                continue
            for i, line in enumerate(lines, start=1):
                match = TODO_PATTERN.search(line)
                if match:
                    content = match.group(1).strip()
                    rel_path = str(file_path.relative_to(root))
                    signals.append(Signal(
                        id=f"todo-{uuid.uuid4().hex[:8]}",
                        source=SignalSource.CODE_TODO,
                        content=content,
                        file_path=rel_path,
                        line_number=i,
                        timestamp=now,
                        metadata={"tag": _extract_tag(line)},
                    ))
    return signals


def scan_lsp_errors(errors: list[dict]) -> list[Signal]:
    """Convert LSP-style error objects into signals.

    Each error dict should have: file, line, message, severity.
    """
    signals: list[Signal] = []
    now = datetime.now(timezone.utc).isoformat()
    for err in errors:
        if err.get("severity", "error") not in ("error", "critical"):
            continue
        signals.append(Signal(
            id=f"lsp-{uuid.uuid4().hex[:8]}",
            source=SignalSource.LSP_ERRORS,
            content=err.get("message", "Unknown error"),
            file_path=err.get("file"),
            line_number=err.get("line"),
            timestamp=now,
            metadata={"severity": err.get("severity", "error")},
        ))
    return signals


def signals_from_telegram(messages: list[dict]) -> list[Signal]:
    """Convert Telegram messages marked as important into signals.

    Each message dict should have: text, sender, date, linked_files.
    """
    signals: list[Signal] = []
    now = datetime.now(timezone.utc).isoformat()
    for msg in messages:
        text = msg.get("text", "").strip()
        if not text:
            continue
        signals.append(Signal(
            id=f"tg-{uuid.uuid4().hex[:8]}",
            source=SignalSource.TELEGRAM,
            content=text,
            file_path=msg.get("linked_files", [None])[0] if msg.get("linked_files") else None,
            line_number=None,
            timestamp=msg.get("date", now),
            metadata={
                "sender": msg.get("sender", "unknown"),
                "linked_files": msg.get("linked_files", []),
            },
        ))
    return signals


def _extract_tag(line: str) -> str:
    """Extract the marker tag (TODO, FIXME, BUG, etc.) from a line."""
    line_upper = line.upper()
    for tag in ("FIXME", "BUG", "HACK", "XXX", "TODO"):
        if tag in line_upper:
            return tag
    return "TODO"
