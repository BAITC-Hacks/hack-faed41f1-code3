from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "Career Quest API"
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    cors_origins: tuple[str, ...] = (
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    )
    nvidia_timeout_seconds: float = 8.0

    @property
    def nvidia_api_key(self) -> str | None:
        return os.getenv("NVIDIA_API_KEY") or None

    @property
    def nvidia_model(self) -> str | None:
        return os.getenv("NVIDIA_MODEL") or None

    @property
    def nvidia_base_url(self) -> str:
        return os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")


settings = Settings()
