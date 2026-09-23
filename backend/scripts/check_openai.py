"""Safe manual OpenAI Responses API check; never prints the API key."""
from __future__ import annotations

import sys
from pathlib import Path
from time import monotonic

from openai import OpenAI, OpenAIError
from pydantic import BaseModel, ConfigDict

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings  # noqa: E402


class CheckResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    ok: bool


def main() -> int:
    if not settings.openai_api_key:
        print("error=missing OPENAI_API_KEY")
        return 1
    if not settings.openai_model:
        print("error=missing OPENAI_MODEL")
        return 1
    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
        max_retries=0,
    )
    started = monotonic()
    try:
        response = client.responses.parse(
            model=settings.openai_model,
            input="Return a successful connectivity check.",
            text_format=CheckResponse,
            max_output_tokens=20,
            timeout=settings.openai_timeout_seconds,
        )
        latency_ms = round((monotonic() - started) * 1000)
        print(f"model={settings.openai_model}")
        print(f"latency_ms={latency_ms}")
        print(f"structured_output={'yes' if response.output_parsed else 'no'}")
        return 0 if response.output_parsed else 1
    except OpenAIError:
        print("error=request_failed")
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
