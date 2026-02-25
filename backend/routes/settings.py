import json
import time
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"
PROJECTS_FILE = Path(__file__).parent.parent / "recent_projects.json"

DEFAULT_SETTINGS = {
    "locale": "en",
    "workspace_root": "",
    "font_size": 14,
    "theme": "vs-dark",
    "anthropic_api_key": "",
    "claude_model": "claude-sonnet-4-20250514",
    "auth_method": "api_key",
    "oauth_access_token": "",
    "oauth_refresh_token": "",
    # Multi-provider fields
    "ai_provider": "anthropic",
    "openai_api_key": "",
    "openai_model": "gpt-4o",
    "gemini_api_key": "",
    "gemini_model": "gemini-2.0-flash",
    "custom_base_url": "",
    "custom_api_key": "",
    "custom_model": "",
    "telegram_api_id": "",
    "telegram_api_hash": "",
    "sound_pack": "default",
    # Signal Refinery — GitHub
    "github_token": "",
    "github_owner": "",
    "github_repo": "",
    "signal_github_enabled": False,
    "signal_github_poll_interval": 300,
    # Signal Refinery — Jira
    "jira_base_url": "",
    "jira_email": "",
    "jira_api_token": "",
    "signal_jira_enabled": False,
    "signal_jira_poll_interval": 300,
    # Signal Refinery — Slack
    "slack_bot_token": "",
    "slack_channels": "",
    "signal_slack_enabled": False,
    "signal_slack_poll_interval": 300,
    # AI Triage
    "signal_ai_triage_enabled": False,
    "signal_hide_low_priority": False,
    # Agentic Supervisor
    "supervisor_enabled": False,
    "supervisor_sandbox_mode": True,
}


class AppSettings(BaseModel):
    locale: str = "en"
    workspace_root: str = ""
    font_size: int = 14
    theme: str = "vs-dark"
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    auth_method: str = "api_key"
    oauth_access_token: str = ""
    oauth_refresh_token: str = ""
    # Multi-provider fields
    ai_provider: str = "anthropic"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    custom_base_url: str = ""
    custom_api_key: str = ""
    custom_model: str = ""
    telegram_api_id: str = ""
    telegram_api_hash: str = ""
    sound_pack: str = "default"
    # Signal Refinery — GitHub
    github_token: str = ""
    github_owner: str = ""
    github_repo: str = ""
    signal_github_enabled: bool = False
    signal_github_poll_interval: int = 300
    # Signal Refinery — Jira
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    signal_jira_enabled: bool = False
    signal_jira_poll_interval: int = 300
    # Signal Refinery — Slack
    slack_bot_token: str = ""
    slack_channels: str = ""
    signal_slack_enabled: bool = False
    signal_slack_poll_interval: int = 300
    # AI Triage
    signal_ai_triage_enabled: bool = False
    signal_hide_low_priority: bool = False
    # Agentic Supervisor
    supervisor_enabled: bool = False
    supervisor_sandbox_mode: bool = True


def load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return {**DEFAULT_SETTINGS, **json.loads(SETTINGS_FILE.read_text())}
        except Exception:
            pass
    return dict(DEFAULT_SETTINGS)


def save_settings(settings: dict):
    SETTINGS_FILE.write_text(json.dumps(settings, indent=2))


@router.get("/", response_model=AppSettings)
async def get_settings():
    return AppSettings(**load_settings())


@router.post("/", response_model=AppSettings)
async def update_settings(req: AppSettings):
    settings = req.model_dump()
    save_settings(settings)
    return AppSettings(**settings)


# --- Recent Projects ---

class RecentProject(BaseModel):
    path: str
    name: str
    last_opened: float

class AddProjectRequest(BaseModel):
    path: str
    name: str = ""


def _load_recent_projects() -> list[dict]:
    if PROJECTS_FILE.exists():
        try:
            return json.loads(PROJECTS_FILE.read_text())
        except Exception:
            pass
    return []


def _save_recent_projects(projects: list[dict]):
    PROJECTS_FILE.write_text(json.dumps(projects, indent=2))


@router.get("/recent-projects", response_model=list[RecentProject])
async def get_recent_projects():
    return [RecentProject(**p) for p in _load_recent_projects()]


@router.post("/add-project", response_model=list[RecentProject])
async def add_project(req: AddProjectRequest):
    projects = _load_recent_projects()
    name = req.name or Path(req.path).name

    # Update existing or add new
    projects = [p for p in projects if p["path"] != req.path]
    projects.insert(0, {"path": req.path, "name": name, "last_opened": time.time()})

    # Keep max 10
    projects = projects[:10]
    _save_recent_projects(projects)

    return [RecentProject(**p) for p in projects]
