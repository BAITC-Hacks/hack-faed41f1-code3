from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app


CSV_HEADER = (
    "record_id,employee_id,event_id,date,due_date,status,completion_pct,"
    "score,feedback_rating,assigned_by\n"
)


def employee(employee_id: str = "E9001") -> dict[str, Any]:
    return {
        "employee_id": employee_id,
        "full_name": "Test Employee",
        "department": "Backend Development",
        "role": "Backend Engineer",
        "grade": "Junior",
        "manager_id": "E0050",
        "hire_date": "2026-01-10",
        "tenure_months": 8,
        "work_format": "hybrid",
        "preferred_language": "ru",
        "career_goal": {
            "target_role": "Backend Engineer",
            "target_grade": "Middle",
        },
        "skills": {
            "SK_PYTHON": 2,
            "SK_SQL": 2,
            "SK_API_DESIGN": 1,
            "SK_SYSTEM_DESIGN": 1,
        },
        "last_review_date": "2026-09-01",
    }


def history_row(
    *,
    record_id: str = "R900001",
    employee_id: str = "E9001",
    event_id: str = "EV_005",
    status: str = "completed",
    completion_pct: str = "100",
    date: str = "2026-09-30",
) -> str:
    return (
        f"{record_id},{employee_id},{event_id},{date},,{status},"
        f"{completion_pct},80,5,self\n"
    )


def post_import(
    client: TestClient,
    employees: list[dict[str, Any]],
    history: str,
):
    return client.post(
        "/api/import",
        files={
            "employees": (
                "employees.json",
                json.dumps({"employees": employees}),
                "application/json",
            ),
            "activity_history": (
                "activity_history.csv",
                CSV_HEADER + history,
                "text/csv",
            ),
        },
    )


def test_successful_import_updates_profile_recommendations_and_hr() -> None:
    with TestClient(app) as client:
        response = post_import(client, [employee()], history_row())
        profile = client.get("/api/employees/E9001")
        recommendations = client.get("/api/employees/E9001/recommendations")
        hr = client.get("/api/hr/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "employeesImported": 1,
        "historyRecordsImported": 1,
        "totalEmployees": 201,
    }
    assert profile.status_code == 200
    assert profile.json()["id"] == "E9001"
    assert recommendations.status_code == 200
    assert len(recommendations.json()) <= 3
    assert hr.status_code == 200
    assert hr.json()["totalEmployees"] == 201


def test_duplicate_employee_id_inside_import_is_rejected() -> None:
    duplicate = deepcopy(employee())
    duplicate["full_name"] = "Duplicate Employee"

    with TestClient(app) as client:
        response = post_import(client, [employee(), duplicate], "")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_DUPLICATE_EMPLOYEE_ID"
    assert response.json()["error"]["details"]["employee_id"] == "E9001"


def test_existing_employee_id_collision_is_rejected() -> None:
    with TestClient(app) as client:
        response = post_import(client, [employee("E0001")], "")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_EMPLOYEE_ID_CONFLICT"


def test_unknown_history_employee_id_is_rejected() -> None:
    with TestClient(app) as client:
        response = post_import(
            client,
            [employee()],
            history_row(employee_id="E9999"),
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_UNKNOWN_EMPLOYEE_ID"
    assert response.json()["error"]["details"]["line"] == 2


def test_unknown_history_event_id_is_rejected() -> None:
    with TestClient(app) as client:
        response = post_import(
            client,
            [employee()],
            history_row(event_id="EV_999"),
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_UNKNOWN_EVENT_ID"
    assert response.json()["error"]["details"]["record_id"] == "R900001"


def test_invalid_status_is_rejected() -> None:
    with TestClient(app) as client:
        response = post_import(
            client,
            [employee()],
            history_row(status="unknown"),
        )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_VALIDATION_ERROR"
    assert response.json()["error"]["details"]["line"] == 2


def test_import_is_atomic_when_history_validation_fails() -> None:
    with TestClient(app) as client:
        before = client.get("/api/employees").json()
        response = post_import(
            client,
            [employee()],
            history_row(event_id="EV_999"),
        )
        after = client.get("/api/employees").json()
        imported_profile = client.get("/api/employees/E9001")

    assert response.status_code == 422
    assert len(before) == len(after) == 200
    assert imported_profile.status_code == 404


@pytest.mark.parametrize(
    ("mutate_employee", "history", "expected_field"),
    [
        (lambda item: item["skills"].update({"SK_PYTHON": 6}), "", "skills"),
        (lambda _item: None, history_row(completion_pct="101"), "completion_pct"),
        (lambda item: item.update({"hire_date": "2026-1-10"}), "", "hire_date"),
        (lambda _item: None, history_row(date="2026-02-30"), "date"),
    ],
)
def test_import_validates_ranges_and_dates(mutate_employee, history: str, expected_field: str) -> None:
    imported_employee = employee()
    mutate_employee(imported_employee)

    with TestClient(app) as client:
        response = post_import(client, [imported_employee], history)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMPORT_VALIDATION_ERROR"
    errors = response.json()["error"]["details"]["errors"]
    assert any(expected_field in error["field"] for error in errors)
