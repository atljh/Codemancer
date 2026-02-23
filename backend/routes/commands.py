import json
import subprocess
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/commands", tags=["commands"])

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"

# Whitelist of allowed commands
ALLOWED_COMMANDS = {
    "git status",
    "git diff",
    "git add .",
    "git push",
    "git log --oneline -10",
}

# Patterns that are allowed with arguments
ALLOWED_PREFIXES = [
    "git commit -m ",
]


class CommandRequest(BaseModel):
    cmd: str
    args: list[str] = []


class CommandResponse(BaseModel):
    status: str  # "success" or "error"
    output: str
    exit_code: int


def _get_workspace() -> str:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            return data.get("workspace_root", "")
        except Exception:
            pass
    return ""


def _is_allowed(full_cmd: str) -> bool:
    if full_cmd in ALLOWED_COMMANDS:
        return True
    for prefix in ALLOWED_PREFIXES:
        if full_cmd.startswith(prefix):
            return True
    return False


@router.post("/exec", response_model=CommandResponse)
async def exec_command(req: CommandRequest):
    workspace = _get_workspace()
    if not workspace:
        raise HTTPException(status_code=400, detail="No workspace configured")

    cwd = Path(workspace)
    if not cwd.is_dir():
        raise HTTPException(status_code=400, detail="Workspace directory not found")

    # Build full command string
    full_cmd = req.cmd
    if req.args:
        full_cmd += " " + " ".join(req.args)

    if not _is_allowed(full_cmd):
        raise HTTPException(status_code=403, detail=f"Command not allowed: {full_cmd}")

    try:
        result = subprocess.run(
            full_cmd,
            shell=True,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout or result.stderr or "(no output)"
        return CommandResponse(
            status="success" if result.returncode == 0 else "error",
            output=output.strip(),
            exit_code=result.returncode,
        )
    except subprocess.TimeoutExpired:
        return CommandResponse(
            status="error",
            output="Command timed out after 30 seconds",
            exit_code=-1,
        )
    except Exception as e:
        return CommandResponse(
            status="error",
            output=str(e),
            exit_code=-1,
        )
