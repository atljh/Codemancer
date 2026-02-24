import json
import subprocess
import shutil
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/repair", tags=["repair"])

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"


def _get_workspace() -> str:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text()).get("workspace_root", "")
        except Exception:
            pass
    return ""


LINT_TOOLS = [
    {
        "name": "ESLint",
        "cmd": "npx eslint . --fix --no-error-on-unmatched-pattern",
        "check": "npx",
        "detect": ["package.json"],
    },
    {
        "name": "Prettier",
        "cmd": "npx prettier --write . --log-level warn",
        "check": "npx",
        "detect": ["package.json"],
    },
    {
        "name": "Ruff",
        "cmd": "ruff check --fix .",
        "check": "ruff",
        "detect": ["pyproject.toml", "ruff.toml", "requirements.txt", "*.py"],
    },
    {
        "name": "Black",
        "cmd": "black . --quiet",
        "check": "black",
        "detect": ["pyproject.toml", "requirements.txt", "*.py"],
    },
]


def _tool_available(tool: dict, workspace: Path) -> bool:
    binary = tool["check"]
    if binary == "npx":
        return (workspace / "package.json").exists()
    return shutil.which(binary) is not None


@router.post("/run")
async def run_self_repair():
    async def generate():
        workspace = _get_workspace()
        if not workspace:
            yield f"data: {json.dumps({'type': 'error', 'message': 'No workspace configured'})}\n\n"
            return

        cwd = Path(workspace)
        if not cwd.is_dir():
            yield f"data: {json.dumps({'type': 'error', 'message': 'Workspace not found'})}\n\n"
            return

        tools_run = 0
        tools_ok = 0

        for tool in LINT_TOOLS:
            if not _tool_available(tool, cwd):
                continue

            yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool['name']})}\n\n"

            try:
                result = subprocess.run(
                    tool["cmd"],
                    shell=True,
                    cwd=str(cwd),
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                output = (result.stdout or result.stderr or "").strip()
                status = "success" if result.returncode == 0 else "warning"
                tools_run += 1
                if status == "success":
                    tools_ok += 1

                yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool['name'], 'status': status, 'output': output[:500], 'exit_code': result.returncode})}\n\n"

            except subprocess.TimeoutExpired:
                tools_run += 1
                yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool['name'], 'status': 'timeout', 'output': 'Timed out after 60s', 'exit_code': -1})}\n\n"

            except Exception as e:
                tools_run += 1
                yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool['name'], 'status': 'error', 'output': str(e)[:200], 'exit_code': -1})}\n\n"

        yield f"data: {json.dumps({'type': 'complete', 'tools_run': tools_run, 'tools_succeeded': tools_ok})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
