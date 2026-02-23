import json
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).parent.parent / "settings.json"

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
