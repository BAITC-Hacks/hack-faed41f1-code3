from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from app.core.config import settings
from app.services.data_loader import DataStore
from app.services.recommender import deterministic_recommendations, recommendations


ResponseMutation = Callable[[list[dict[str, Any]], list[dict[str, Any]]], None]


@pytest.fixture
def store() -> DataStore:
    return DataStore.load(settings.data_dir)


@pytest.fixture
def employee(store: DataStore) -> dict[str, Any]:
    result = store.get_employee("E0090")
    assert result is not None
    return result


@pytest.fixture(autouse=True)
def clean_nvidia_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.delenv("NVIDIA_MODEL", raising=False)
    monkeypatch.delenv("NVIDIA_BASE_URL", raising=False)


def enable_nvidia(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODEL", "test/model")
    monkeypatch.setenv("NVIDIA_BASE_URL", "https://nim.test/v1")


def mock_client(
    mutation: ResponseMutation | None = None,
    captured: list[dict[str, Any]] | None = None,
) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        prompt = json.loads(body["messages"][1]["content"])
        candidates = prompt["candidates"]
        selected_candidates = list(reversed(candidates[:3]))
        selected = [
            {
                "event_id": candidate["event_id"],
                "rank": rank,
                "reasons": [
                    {"factor": reason["factor"], "fact": reason["fact"]}
                    for reason in candidate["allowed_reasons"][:3]
                ],
            }
            for rank, candidate in enumerate(selected_candidates, start=1)
        ]
        if mutation:
            mutation(selected, candidates)
        if captured is not None:
            captured.append({"request": request, "body": body, "candidates": candidates})
        content = json.dumps({"recommendations": selected}, ensure_ascii=False)
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    return httpx.Client(transport=httpx.MockTransport(handler))


def test_valid_ai_response_reranks_top_candidates(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)
    captured: list[dict[str, Any]] = []
    deterministic = deterministic_recommendations(store, employee)

    with mock_client(captured=captured) as client:
        result = recommendations(store, employee, ai_client=client)

    assert [item["activityId"] for item in result] == [
        item["activityId"] for item in reversed(deterministic)
    ]
    deterministic_by_id = {item["activityId"]: item for item in deterministic}
    assert all(item["score"] == deterministic_by_id[item["activityId"]]["score"] for item in result)
    assert all(item["skillLevels"] == deterministic_by_id[item["activityId"]]["skillLevels"] for item in result)
    assert len(captured[0]["candidates"]) == 8
    assert captured[0]["request"].url == "https://nim.test/v1/chat/completions"
    assert captured[0]["body"]["model"] == "test/model"
    assert set(captured[0]["candidates"][0]) == {
        "event_id",
        "title",
        "type",
        "format",
        "duration_hours",
        "deterministic_score",
        "score_breakdown",
        "skills",
        "critical_gaps",
        "history_fit_summary",
        "career_target",
        "availability",
        "allowed_reasons",
    }


def test_missing_api_key_skips_ai_and_uses_fallback(
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    def unexpected_call(_request: httpx.Request) -> httpx.Response:
        raise AssertionError("NVIDIA must not be called without NVIDIA_API_KEY")

    with httpx.Client(transport=httpx.MockTransport(unexpected_call)) as client:
        result = recommendations(store, employee, ai_client=client)

    assert result == deterministic_recommendations(store, employee)


def test_timeout_retries_once_then_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)
    calls = 0

    def timeout(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        raise httpx.ReadTimeout("NVIDIA timed out", request=request)

    with httpx.Client(transport=httpx.MockTransport(timeout)) as client:
        result = recommendations(store, employee, ai_client=client)

    assert calls == 2
    assert result == deterministic_recommendations(store, employee)


def test_unknown_event_id_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)

    def mutation(selected: list[dict[str, Any]], _candidates: list[dict[str, Any]]) -> None:
        selected[0]["event_id"] = "EV_999"

    with mock_client(mutation) as client:
        result = recommendations(store, employee, ai_client=client)

    assert result == deterministic_recommendations(store, employee)


def test_duplicate_event_id_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)

    def mutation(selected: list[dict[str, Any]], _candidates: list[dict[str, Any]]) -> None:
        selected[1]["event_id"] = selected[0]["event_id"]

    with mock_client(mutation) as client:
        result = recommendations(store, employee, ai_client=client)

    assert result == deterministic_recommendations(store, employee)


def test_fewer_than_three_factors_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)

    def mutation(selected: list[dict[str, Any]], _candidates: list[dict[str, Any]]) -> None:
        selected[0]["reasons"] = selected[0]["reasons"][:2]

    with mock_client(mutation) as client:
        result = recommendations(store, employee, ai_client=client)

    assert result == deterministic_recommendations(store, employee)


def test_hallucinated_number_or_skill_uses_fallback(
    monkeypatch: pytest.MonkeyPatch,
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    enable_nvidia(monkeypatch)

    def mutation(selected: list[dict[str, Any]], _candidates: list[dict[str, Any]]) -> None:
        selected[0]["reasons"][0]["fact"] += " Несуществующий навык: уровень 99."

    with mock_client(mutation) as client:
        result = recommendations(store, employee, ai_client=client)

    assert result == deterministic_recommendations(store, employee)


def test_fallback_preserves_previous_top_three_response_format(
    store: DataStore,
    employee: dict[str, Any],
) -> None:
    result = recommendations(store, employee)

    assert result == deterministic_recommendations(store, employee)
    assert 1 <= len(result) <= 3
    assert all(
        set(item)
        == {
            "id",
            "employeeId",
            "activityId",
            "title",
            "description",
            "score",
            "factors",
            "skillLevels",
            "format",
            "durationHours",
            "startDate",
        }
        for item in result
    )
    assert all(len(item["factors"]) >= 3 for item in result)
