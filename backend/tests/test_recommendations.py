from fastapi.testclient import TestClient

from app.main import app


def test_recommendations_are_explainable_and_eligible() -> None:
    with TestClient(app) as client:
        response = client.get("/api/employees/E0001/recommendations")

    assert response.status_code == 200
    recommendations = response.json()
    assert 1 <= len(recommendations) <= 3
    assert all(len(item["factors"]) >= 3 for item in recommendations)
    assert all(item["activityId"] not in {"EV_001", "EV_002", "EV_003", "EV_004"} for item in recommendations)


def test_complete_updates_in_memory_progress() -> None:
    with TestClient(app) as client:
        before = client.get("/api/employees/E0001/recommendations").json()
        recommendation = before[0]
        response = client.post(
            f"/api/employees/E0001/complete/{recommendation['activityId']}"
        )
        after = client.get("/api/employees/E0001/recommendations").json()
        activities = client.get("/api/employees/E0001/activities").json()

    assert response.status_code == 200
    assert response.json() == {"success": True}
    assert recommendation["activityId"] not in {item["activityId"] for item in after}
    assert any(
        item["activityId"] == recommendation["activityId"] and item["status"] == "completed"
        for item in activities
    )


def test_complete_unknown_event_is_404() -> None:
    with TestClient(app) as client:
        response = client.post("/api/employees/E0001/complete/EV_999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "EVENT_NOT_FOUND"


def test_hr_dashboard_contains_all_source_statuses() -> None:
    with TestClient(app) as client:
        response = client.get("/api/hr/dashboard")
    assert response.status_code == 200
    status = response.json()["statusBreakdown"]
    assert all(status[name] > 0 for name in ("completed", "dropout", "declined", "noShow"))
