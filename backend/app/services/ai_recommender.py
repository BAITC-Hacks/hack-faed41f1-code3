from __future__ import annotations

import json
from dataclasses import dataclass
from time import monotonic
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.config import settings


SYSTEM_PROMPT = """You rank already eligible Career Quest learning events.
Return strict JSON only, without markdown, using this schema:
{"recommendations":[{"event_id":"EV_001","rank":1,"reasons":[{"factor":"critical_skill","fact":"..."}]}]}
Select at most 3 unique events only from the supplied candidates. Ranks must start at 1 and be consecutive.
Each recommendation must contain at least 3 reasons with different factors.
For every reason, copy factor and fact verbatim from that candidate's allowed_reasons.
Never calculate or alter eligibility, scores, levels, gaps, gain, max_level, dates, or event facts."""


@dataclass(frozen=True)
class AICandidate:
    response: dict[str, Any]
    context: dict[str, Any]
    fact_templates: dict[str, dict[str, str]]


class AIReason(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    factor: str
    fact: str


class AIRankedRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    event_id: str
    rank: int
    reasons: list[AIReason]


class AIRanking(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    recommendations: list[AIRankedRecommendation]


def _prompt_candidates(candidates: list[AICandidate]) -> list[dict[str, Any]]:
    result = []
    for candidate in candidates:
        result.append(
            {
                **candidate.context,
                "allowed_reasons": list(candidate.fact_templates.values()),
            }
        )
    return result


def _validated_selection(
    content: str,
    candidates: list[AICandidate],
) -> list[dict[str, Any]] | None:
    try:
        ranking = AIRanking.model_validate_json(content)
    except (ValidationError, ValueError):
        return None

    selected = ranking.recommendations
    if not selected or len(selected) > 3:
        return None
    if sorted(item.rank for item in selected) != list(range(1, len(selected) + 1)):
        return None

    by_event_id = {candidate.context["event_id"]: candidate for candidate in candidates}
    event_ids = [item.event_id for item in selected]
    if len(event_ids) != len(set(event_ids)) or any(event_id not in by_event_id for event_id in event_ids):
        return None

    result: list[dict[str, Any]] = []
    for item in sorted(selected, key=lambda recommendation: recommendation.rank):
        candidate = by_event_id[item.event_id]
        factors = [reason.factor for reason in item.reasons]
        if len(factors) < 3 or len(factors) != len(set(factors)):
            return None
        for reason in item.reasons:
            template = candidate.fact_templates.get(reason.factor)
            if template is None or reason.fact != template["fact"]:
                return None

        response = dict(candidate.response)
        response["factors"] = [
            {
                "label": candidate.fact_templates[reason.factor]["label"],
                "detail": candidate.fact_templates[reason.factor]["fact"],
            }
            for reason in item.reasons
        ]
        result.append(response)
    return result


def rerank_with_nvidia(
    candidates: list[AICandidate],
    *,
    client: httpx.Client | None = None,
) -> list[dict[str, Any]] | None:
    api_key = settings.nvidia_api_key
    model = settings.nvidia_model
    if not api_key or not model or not candidates:
        return None

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {"candidates": _prompt_candidates(candidates[:8])},
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
            },
        ],
        "temperature": 0,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
    }
    owns_client = client is None
    http_client = client or httpx.Client()
    deadline = monotonic() + settings.nvidia_timeout_seconds
    try:
        for attempt in range(2):
            remaining = deadline - monotonic()
            if remaining <= 0:
                return None
            try:
                response = http_client.post(
                    f"{settings.nvidia_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=httpx.Timeout(remaining),
                )
                response.raise_for_status()
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == 0:
                    continue
                return None
            except httpx.HTTPError:
                return None

            try:
                body = response.json()
                content = body["choices"][0]["message"]["content"]
                if not isinstance(content, str):
                    return None
            except (ValueError, KeyError, IndexError, TypeError):
                return None
            return _validated_selection(content, candidates[:8])
    finally:
        if owns_client:
            http_client.close()
    return None
