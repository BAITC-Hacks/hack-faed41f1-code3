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
    default_nvidia_timeout_seconds: float = 8.0

    @property
    def nvidia_api_key(self) -> str | None:
        return os.getenv("NVIDIA_API_KEY") or None

    @property
    def nvidia_model(self) -> str | None:
        return os.getenv("NVIDIA_MODEL", "openai/gpt-oss-20b") or None

    @property
    def nvidia_api_url(self) -> str:
        return os.getenv(
            "NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions"
        ).rstrip("/")

    @property
    def nvidia_use_response_format(self) -> bool:
        return os.getenv("NVIDIA_USE_RESPONSE_FORMAT", "true").strip().lower() in {
            "1", "true", "yes", "on"
        }

    @property
    def nvidia_timeout_seconds(self) -> float:
        try:
            return max(0.1, float(os.getenv("NVIDIA_TIMEOUT_SECONDS", self.default_nvidia_timeout_seconds)))
        except ValueError:
            return self.default_nvidia_timeout_seconds


settings = Settings()
