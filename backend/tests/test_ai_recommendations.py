from __future__ import annotations

import json
from copy import deepcopy
from types import SimpleNamespace
from typing import Any

import pytest
from openai import APIConnectionError, APITimeoutError, OpenAIError

from app.core.config import settings
from app.services import ai_recommender
from app.services.ai_recommender import AIRanking
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
def openai_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    ai_recommender._cache.clear()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_MODEL", raising=False)


def enable_openai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_MODEL", "test-model")


class FakeResponses:
    def __init__(self, mutate=None, calls: list[dict[str, Any]] | None = None, error=None) -> None:
        self.mutate = mutate
        self.calls = calls
        self.error = error

    def parse(self, **kwargs: Any) -> SimpleNamespace:
        if self.calls is not None:
            self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        candidates = json.loads(kwargs["input"])["candidates"]
        selected = [
            {
                "eventId": candidate["eventId"],
                "reasonIds": [item["id"] for item in candidate["evidence"][:3]],
            }
            for candidate in reversed(candidates[:3])
        ]
        if self.mutate:
            self.mutate(selected)
        return SimpleNamespace(
            output_parsed=AIRanking.model_validate({"recommendations": selected})
        )


class FakeOpenAI:
    def __init__(self, mutate=None, calls: list[dict[str, Any]] | None = None, error=None) -> None:
        self.responses = FakeResponses(mutate=mutate, calls=calls, error=error)


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


def test_successful_openai_response_uses_responses_api_and_keeps_public_shape(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_openai(monkeypatch)
    calls: list[dict[str, Any]] = []
    result = recommendations(store, employee, ai_client=FakeOpenAI(calls=calls))  # type: ignore[arg-type]
    assert len(result) == 3
    assert all("evidence" not in item and "source" not in item for item in result)
    assert all(len(item["factors"]) >= 3 for item in result)
    assert len(calls) == 1
    assert calls[0]["model"] == "test-model"
    assert calls[0]["text_format"] is AIRanking
    assert len(json.loads(calls[0]["input"])["candidates"]) <= 8


@pytest.mark.parametrize("mutation", [
    lambda selected: selected[0].update(eventId="EV_999"),
    lambda selected: selected[1].update(eventId=selected[0]["eventId"]),
    lambda selected: selected[0].update(reasonIds=["unknown:evidence", "career:target", "history:fit"]),
    lambda selected: selected[0].update(reasonIds=selected[0]["reasonIds"][:2]),
    lambda selected: selected[0].update(extra="forbidden"),
])
def test_invalid_openai_response_uses_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any], mutation
) -> None:
    enable_openai(monkeypatch)
    expected = deterministic_recommendations(store, employee)
    client = FakeOpenAI(mutate=mutation)
    assert recommendations(store, employee, ai_client=client) == expected  # type: ignore[arg-type]


def test_openai_error_uses_deterministic_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_openai(monkeypatch)
    client = FakeOpenAI(error=OpenAIError("timeout"))
    assert recommendations(store, employee, ai_client=client) == deterministic_recommendations(  # type: ignore[arg-type]
        store, employee
    )


def test_openai_timeout_does_not_retry_and_uses_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_openai(monkeypatch)
    calls: list[dict[str, Any]] = []
    client = FakeOpenAI(calls=calls, error=APITimeoutError(request=object()))  # type: ignore[arg-type]
    assert recommendations(store, employee, ai_client=client) == deterministic_recommendations(  # type: ignore[arg-type]
        store, employee
    )
    assert len(calls) == 1


def test_openai_network_error_retries_once_then_uses_fallback(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_openai(monkeypatch)
    calls: list[dict[str, Any]] = []
    client = FakeOpenAI(calls=calls, error=APIConnectionError(request=object()))  # type: ignore[arg-type]
    assert recommendations(store, employee, ai_client=client) == deterministic_recommendations(  # type: ignore[arg-type]
        store, employee
    )
    assert len(calls) == 2


def test_repeated_request_uses_openai_cache(
    monkeypatch: pytest.MonkeyPatch, store: DataStore, employee: dict[str, Any]
) -> None:
    enable_openai(monkeypatch)
    calls: list[dict[str, Any]] = []
    client = FakeOpenAI(calls=calls)
    first = recommendations(store, employee, ai_client=client)  # type: ignore[arg-type]
    second = recommendations(store, employee, ai_client=client)  # type: ignore[arg-type]
    assert first == second
    assert len(calls) == 1
