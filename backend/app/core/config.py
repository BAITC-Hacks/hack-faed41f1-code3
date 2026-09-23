import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


# Local secrets are optional and never override deployment environment variables.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    app_name: str = "Career Quest API"
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    cors_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )
    openai_timeout_seconds: float = 8.0

    @property
    def openai_api_key(self) -> str | None:
        return os.getenv("OPENAI_API_KEY") or None

    @property
    def openai_model(self) -> str | None:
        return os.getenv("OPENAI_MODEL") or None


settings = Settings()
