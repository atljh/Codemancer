import subprocess
import re
from pathlib import Path

from fastapi import APIRouter

from routes.settings import load_settings as _load_settings_from_file

router = APIRouter(prefix="/api/proactive", tags=["proactive"])


def _run_git_diff(workspace: str) -> str:
    """Get git diff summary for unstaged changes."""
    try:
        result = subprocess.run(
            ["git", "diff", "--stat"],
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def _run_git_diff_detail(workspace: str) -> str:
    """Get abbreviated git diff content."""
    try:
        result = subprocess.run(
            ["git", "diff", "--unified=2"],
            cwd=workspace,
            capture_output=True,
            text=True,
            timeout=10,
        )
        output = result.stdout.strip() if result.returncode == 0 else ""
        # Truncate to keep it manageable
        if len(output) > 3000:
            output = output[:3000] + "\n... (truncated)"
        return output
    except Exception:
        return ""


def _find_recent_errors(workspace: str) -> list[dict]:
    """Scan for common error patterns in recent git diff."""
    errors: list[dict] = []
    diff = _run_git_diff_detail(workspace)
    if not diff:
        return errors

    # Only look at added lines
    added_lines = [line[1:] for line in diff.split("\n") if line.startswith("+") and not line.startswith("+++")]

    patterns = [
        (r"console\.(error|warn)\(", "console_error", "Console error/warning detected"),
        (r"TODO|FIXME|HACK|XXX", "todo_marker", "TODO/FIXME marker found"),
        (r"\.catch\(\s*\(\s*\)\s*=>", "empty_catch", "Empty catch block detected"),
        (r"any\b", "typescript_any", "TypeScript 'any' type usage"),
        (r"# type:\s*ignore", "type_ignore", "Type ignore comment"),
        (r"eslint-disable", "lint_disable", "Linter rule disabled"),
    ]

    for line in added_lines:
        for pattern, category, description in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                errors.append({
                    "category": category,
                    "description": description,
                    "line_preview": line.strip()[:120],
                })
                break

    # Deduplicate by category
    seen = set()
    unique = []
    for e in errors:
        if e["category"] not in seen:
            seen.add(e["category"])
            unique.append(e)

    return unique[:5]


def _detect_redundancy(workspace: str) -> list[dict]:
    """Detect potential redundancies in recent changes."""
    findings: list[dict] = []
    diff = _run_git_diff_detail(workspace)
    if not diff:
        return findings

    # Check for duplicate function patterns
    added_funcs: list[str] = []
    for line in diff.split("\n"):
        if line.startswith("+") and not line.startswith("+++"):
            # Match function/method definitions
            func_match = re.search(r"(?:function|def|const|let|var)\s+(\w+)", line)
            if func_match:
                added_funcs.append(func_match.group(1))

    # Check for very long added blocks (potential code smell)
    added_count = sum(1 for l in diff.split("\n") if l.startswith("+") and not l.startswith("+++"))
    removed_count = sum(1 for l in diff.split("\n") if l.startswith("-") and not l.startswith("---"))

    if added_count > 100 and removed_count < 10:
        findings.append({
            "type": "large_addition",
            "description": f"Large code addition ({added_count} lines) with minimal removal ({removed_count} lines)",
        })

    if added_count > 0 and removed_count > 0 and abs(added_count - removed_count) < 5 and added_count > 20:
        findings.append({
            "type": "possible_rewrite",
            "description": f"Possible full rewrite detected ({added_count}+ / {removed_count}-)",
        })

    return findings[:3]


@router.get("/pulse")
async def background_pulse():
    """Background pulse analysis — checks git diff and error patterns."""
    settings = _load_settings_from_file()
    workspace = settings.get("workspace_root", "")

    if not workspace or not Path(workspace).is_dir():
        return {"has_findings": False, "findings": [], "diff_summary": "", "errors": []}

    diff_summary = _run_git_diff(workspace)
    errors = _find_recent_errors(workspace)
    redundancies = _detect_redundancy(workspace)

    findings: list[dict] = []

    for err in errors:
        findings.append({
            "severity": "warning",
            "type": err["category"],
            "message": err["description"],
            "detail": err.get("line_preview", ""),
        })

    for red in redundancies:
        findings.append({
            "severity": "info",
            "type": red["type"],
            "message": red["description"],
            "detail": "",
        })

    has_findings = len(findings) > 0 or bool(diff_summary)

    return {
        "has_findings": has_findings,
        "findings": findings,
        "diff_summary": diff_summary,
        "errors": errors,
        "changed_files": len(diff_summary.split("\n")) - 1 if diff_summary else 0,
    }
