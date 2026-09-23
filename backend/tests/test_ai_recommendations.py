from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

import httpx
import pytest

from app.core.config import settings
from app.services import ai_recommender
from app.services.data_loader import DataStore
from app.services.recommender import (
    deterministic_recommendations,
    is_eligible,
    rank_candidates,
    recommendations,
)


@pytest.fixture
def store() -> DataStore:
    return DataStore.load(settings.data_dir)


@pytest.fixture
def employee(store: DataStore) -> dict[str, Any]:
    return store.get_employee("E0090")  # type: ignore[return-value]


@pytest.fixture(autouse=True)
def nvidia_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    ai_recommender._cache.clear()
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    monkeypatch.delenv("NVIDIA_MODEL", raising=False)
    monkeypatch.delenv("NVIDIA_API_URL", raising=False)


def enable_nvidia(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NVIDIA_API_KEY", "test-key")
    monkeypatch.setenv("NVIDIA_MODEL", "test/model")
    monkeypatch.setenv("NVIDIA_API_URL", "https://nim.test/v1/chat/completions")


def client_with_response(mutate=None, calls: list[int] | None = None) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(1)
        body = json.loads(request.content)
        candidates = json.loads(body["messages"][1]["content"])["candidates"]
        selected = []
        for candidate in reversed(candidates[:3]):
            selected.append({"eventId": candidate["eventId"], "reasonIds": [item["id"] for item in candidate["evidence"][:3]]})
        if mutate:
            mutate(selected)
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"recommendations": selected})}}]})
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_deterministic_ranking_is_stable_and_limited(store: DataStore, employee: dict[str, Any]) -> None:
    first = rank_candidates(store, employee)
    second = rank_candidates(store, employee)
    assert [item.response["activityId"] for item in first] == [item.response["activityId"] for item in second]
    assert len(first) <= 8
    assert [(-item.response["score"], item.response["activityId"]) for item in first] == sorted(
        (-item.response["score"], item.response["activityId"]) for item in first
    )


def test_mandatory_completed_and_prerequisites_are_ineligible(store: DataStore, employee: dict[str, Any]) -> None:
    levels = {skill: 5 for skill in store.skills}
    mandatory = deepcopy(store.events["EV_001"])
    assert not is_eligible(store, employee, mandatory, levels)
    event = deepcopy(store.events["EV_005"])
    event["prerequisites"] = {next(iter(store.skills)): 6}
    assert not is_eligible(store, employee, event, levels)


def test_gain_is_capped_and_event_without_positive_gap_is_excluded(store: DataStore, employee: dict[str, Any]) -> None:
    candidates = rank_candidates(store, employee)
    for candidate in candidates:
        gap_facts = [value for key, value in candidate.evidence.items() if key.startswith("gap:")]
        assert gap_facts and all(item["expected"] <= item["max_level"] for item in gap_facts)
        assert all(item["effective_gain"] > 0 for item in gap_facts)


def test_missing_configuration_uses_deterministic_fallback(store: DataStore, employee: dict[str, Any]) -> None:
    assert recommendations(store, employee) == deterministic_recommendations(store, employee)


@pytest.mark.parametrize("employee_id", ["E0001", "E0090", "E0200"])
def test_local_engine_returns_explainable_recommendations_for_real_employees(
    store: DataStore, employee_id: str
) -> None:
    employee = store.get_employee(employee_id)
    assert employee is not None
    result = recommendations(store, employee)
    assert 1 <= len(result) <= 3
    assert all(len(item["factors"]) >= 3 for item in result)
    assert result == deterministic_recommendations(store, employee)


def test_successful_nvidia_response_reranks_and_keeps_public_shape(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_nvidia(monkeypatch)
    with client_with_response() as client:
        result = recommendations(store, employee, ai_client=client)
    assert len(result) == 3
    assert all("evidence" not in item and "source" not in item for item in result)
    assert all(len(item["factors"]) >= 3 for item in result)


@pytest.mark.parametrize("mutation", [
    lambda selected: selected[0].update(eventId="EV_999"),
    lambda selected: selected[1].update(eventId=selected[0]["eventId"]),
    lambda selected: selected[0].update(reasonIds=["unknown:evidence", "career:target", "history:fit"]),
    lambda selected: selected[0].update(reasonIds=selected[0]["reasonIds"][:2]),
    lambda selected: selected[0].update(extra="forbidden"),
])
def test_invalid_nvidia_response_uses_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any], mutation
) -> None:
    enable_nvidia(monkeypatch)
    expected = deterministic_recommendations(store, employee)
    with client_with_response(mutation) as client:
        assert recommendations(store, employee, ai_client=client) == expected


def test_http_401_has_no_retry_and_uses_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_nvidia(monkeypatch)
    calls: list[int] = []
    client = httpx.Client(transport=httpx.MockTransport(lambda _request: (calls.append(1), httpx.Response(401))[1]))
    with client:
        assert recommendations(store, employee, ai_client=client) == deterministic_recommendations(store, employee)
    assert len(calls) == 1


def test_repeated_request_uses_nvidia_cache(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_nvidia(monkeypatch)
    calls: list[int] = []
    with client_with_response(calls=calls) as client:
        first = recommendations(store, employee, ai_client=client)
        second = recommendations(store, employee, ai_client=client)
    assert first == second
    assert len(calls) == 1
