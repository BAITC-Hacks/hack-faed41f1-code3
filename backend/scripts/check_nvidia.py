"""Safe manual connectivity check for NVIDIA NIM; never prints the API key."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from time import monotonic

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import settings  # noqa: E402


def main() -> int:
    if not settings.nvidia_api_key:
        print("error=missing NVIDIA_API_KEY")
        return 1
    if not settings.nvidia_model:
        print("error=missing NVIDIA_MODEL")
        return 1
    payload = {
        "model": settings.nvidia_model,
        "messages": [{"role": "user", "content": 'Return {"ok":true} as JSON.'}],
        "temperature": 0,
        "max_tokens": 20,
        "stream": False,
    }
    if settings.nvidia_use_response_format:
        payload["response_format"] = {"type": "json_object"}
    started = monotonic()
    try:
        response = httpx.post(
            settings.nvidia_api_url,
            headers={"Authorization": f"Bearer {settings.nvidia_api_key}"},
            json=payload,
            timeout=settings.nvidia_timeout_seconds,
        )
        latency_ms = round((monotonic() - started) * 1000)
        print(f"model={settings.nvidia_model}")
        print(f"http_status={response.status_code}")
        print(f"latency_ms={latency_ms}")
        if response.is_error:
            print("error=http_error")
            return 1
        content = response.json()["choices"][0]["message"]["content"]
        try:
            json.loads(content)
            print("valid_json=yes")
            return 0
        except (TypeError, ValueError):
            print("valid_json=no")
            return 1
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        print("error=request_failed")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
