from fastapi.testclient import TestClient

from app.main import app


def test_employee_list_and_detail() -> None:
    with TestClient(app) as client:
        employees = client.get("/api/employees")
        detail = client.get("/api/employees/E0001")
        trajectory = client.get("/api/employees/E0001/trajectory")

    assert employees.status_code == 200
    assert len(employees.json()) == 200
    assert detail.status_code == 200
    assert detail.json()["id"] == "E0001"
    assert trajectory.status_code == 200
    assert trajectory.json()["asOfDate"] == "2026-10-01"


def test_unknown_employee_has_contract_error() -> None:
    with TestClient(app) as client:
        response = client.get("/api/employees/E9999")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "EMPLOYEE_NOT_FOUND",
            "message": "Employee E9999 was not found",
            "details": None,
        }
    }
