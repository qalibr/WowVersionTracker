"""
app/config.py: A dedicated place to load environment variables using pydantic-settings. You'll need variables for GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and your ENCRYPTION_KEY.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    github_client_id: str
    github_client_secret: str
    encryption_key: str
    jwt_secret: str
    frontend_url: str = "http://localhost:5173"
    github_app_id: str
    github_private_key_path: str
    github_webhook_secret: str
    github_app_slug: str

    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, extra="ignore")


settings = Settings()
