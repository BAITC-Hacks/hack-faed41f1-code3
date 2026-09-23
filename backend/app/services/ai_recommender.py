from __future__ import annotations

import hashlib
import json
from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Any, Literal

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings


MAX_CACHE_ENTRIES = 500
_cache: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
_cache_lock = Lock()

SYSTEM_PROMPT = """Return one strict JSON object only. Rank exactly three supplied events.
For each event, return only eventId and three or more reasonIds from that event.
Do not create event IDs, evidence IDs, facts, numbers, eligibility decisions, or explanations.
Schema: {"recommendations":[{"eventId":"EV_001","reasonIds":["gap:SK_X","career:target","history:fit"]}]}"""


@dataclass(frozen=True)
class AICandidate:
    response: dict[str, Any]
    evidence: dict[str, dict[str, Any]]


@dataclass(frozen=True)
class RerankOutcome:
    result: list[dict[str, Any]] | None
    source: Literal["nvidia", "cache", "deterministic"]
    reason: str | None = None


class AIRankedRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True)

    event_id: str = Field(alias="eventId")
    reason_ids: list[str] = Field(alias="reasonIds")


class AIRanking(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    recommendations: list[AIRankedRecommendation]


def _prompt_candidates(candidates: list[AICandidate]) -> list[dict[str, Any]]:
    return [
        {
            "eventId": candidate.response["activityId"],
            "title": candidate.response["title"],
            "deterministicScore": candidate.response["score"],
            "evidence": [
                {"id": evidence_id, "fact": item["fact"]}
                for evidence_id, item in sorted(candidate.evidence.items())
            ],
        }
        for candidate in candidates
    ]


def _fingerprint(employee_id: str, model: str, candidates: list[AICandidate]) -> str:
    payload = json.dumps(
        {"employeeId": employee_id, "model": model, "candidates": _prompt_candidates(candidates)},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> list[dict[str, Any]] | None:
    with _cache_lock:
        value = _cache.get(key)
        if value is not None:
            _cache.move_to_end(key)
        return value


def _cache_put(key: str, value: list[dict[str, Any]]) -> None:
    with _cache_lock:
        _cache[key] = value
        _cache.move_to_end(key)
        while len(_cache) > MAX_CACHE_ENTRIES:
            _cache.popitem(last=False)


def _strip_single_json_fence(content: str) -> str:
    content = content.strip()
    if content.startswith("```json") and content.endswith("```"):
        return content[7:-3].strip()
    if content.startswith("```") and content.endswith("```"):
        return content[3:-3].strip()
    return content


def _validated_selection(content: str, candidates: list[AICandidate]) -> list[dict[str, Any]] | None:
    try:
        ranking = AIRanking.model_validate_json(_strip_single_json_fence(content))
    except (ValidationError, ValueError):
        return None
    if len(ranking.recommendations) != 3:
        return None
    by_event_id = {candidate.response["activityId"]: candidate for candidate in candidates}
    event_ids = [item.event_id for item in ranking.recommendations]
    if len(event_ids) != len(set(event_ids)) or any(event_id not in by_event_id for event_id in event_ids):
        return None
    result: list[dict[str, Any]] = []
    for item in ranking.recommendations:
        candidate = by_event_id[item.event_id]
        if len(item.reason_ids) < 3 or len(item.reason_ids) != len(set(item.reason_ids)):
            return None
        evidence = [candidate.evidence.get(reason_id) for reason_id in item.reason_ids]
        if any(item is None for item in evidence) or len({item["factor"] for item in evidence if item}) < 3:
            return None
        response = dict(candidate.response)
        response["factors"] = [
            {"label": item["label"], "detail": item["fact"]} for item in evidence if item
        ]
        result.append(response)
    return result


def _http_reason(status_code: int) -> str:
    if status_code in {400, 401, 403, 429}:
        return f"http_{status_code}"
    return "http_5xx" if status_code >= 500 else f"http_{status_code}"


def rerank_with_nvidia(
    employee_id: str, candidates: list[AICandidate], *, client: httpx.Client | None = None
) -> RerankOutcome:
    api_key, model = settings.nvidia_api_key, settings.nvidia_model
    if not api_key or not model:
        return RerankOutcome(None, "deterministic", "missing_configuration")
    if len(candidates) < 3:
        return RerankOutcome(None, "deterministic", "fewer_than_three_candidates")
    key = _fingerprint(employee_id, model, candidates)
    cached = _cache_get(key)
    if cached is not None:
        return RerankOutcome(cached, "cache")

    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({"candidates": _prompt_candidates(candidates)}, ensure_ascii=False)},
        ],
        "temperature": 0,
        "max_tokens": 500,
        "stream": False,
    }
    if settings.nvidia_use_response_format:
        payload["response_format"] = {"type": "json_object"}
    owns_client = client is None
    http_client = client or httpx.Client()
    deadline = monotonic() + settings.nvidia_timeout_seconds
    try:
        for attempt in range(2):
            remaining = deadline - monotonic()
            if remaining <= 0:
                return RerankOutcome(None, "deterministic", "timeout")
            try:
                response = http_client.post(
                    settings.nvidia_api_url,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=httpx.Timeout(remaining),
                )
            except httpx.TimeoutException:
                if attempt == 0:
                    continue
                return RerankOutcome(None, "deterministic", "timeout")
            except httpx.NetworkError:
                if attempt == 0:
                    continue
                return RerankOutcome(None, "deterministic", "network_error")
            if response.is_error:
                return RerankOutcome(None, "deterministic", _http_reason(response.status_code))
            try:
                content = response.json()["choices"][0]["message"]["content"]
            except (ValueError, KeyError, IndexError, TypeError):
                return RerankOutcome(None, "deterministic", "invalid_json")
            if not isinstance(content, str):
                return RerankOutcome(None, "deterministic", "invalid_json")
            result = _validated_selection(content, candidates)
            if result is None:
                return RerankOutcome(None, "deterministic", "validation_failed")
            _cache_put(key, result)
            return RerankOutcome(result, "nvidia")
    finally:
        if owns_client:
            http_client.close()
    return RerankOutcome(None, "deterministic", "timeout")
