from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Request, UploadFile

from app.schemas.employee import ActivityHistoryEntry, Employee, Trajectory
from app.schemas.hr import HRDashboard
from app.schemas.import_data import ImportResult
from app.schemas.recommendation import CompletionResult, Recommendation
from app.services.data_loader import DataStore
from app.services.hr_analytics import hr_dashboard
from app.services.importer import ImportValidationError, prepare_import
from app.services.recommender import is_eligible, recommendations
from app.services.trajectory import effective_skills, target_profile, trajectory


class APIError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


router = APIRouter()


def _store(request: Request) -> DataStore:
    return request.app.state.store


def _employee_or_404(store: DataStore, employee_id: str) -> dict[str, Any]:
    employee = store.get_employee(employee_id)
    if not employee:
        raise APIError(404, "EMPLOYEE_NOT_FOUND", f"Employee {employee_id} was not found")
    return employee


def _employee_response(store: DataStore, employee: dict[str, Any]) -> dict[str, Any]:
    levels = effective_skills(store, employee)
    profile = target_profile(store, employee)
    goal = employee.get("career_goal")
    goal_text = (
        f"{goal['target_role']} / {goal['target_grade']}"
        if goal
        else f"{profile['role']} / {profile['grade']}"
    )
    names = employee["full_name"].split()
    initials = "".join(part[0].upper() for part in names[:2])
    skills = []
    skill_ids = list(dict.fromkeys([*profile["required_skills"], *levels]))
    for skill_id in skill_ids:
        catalog_skill = store.skills[skill_id]
        skills.append(
            {
                "id": skill_id,
                "name": catalog_skill["name"],
                "category": "hard" if catalog_skill["type"] == "hard" else "soft",
                "currentLevel": levels.get(skill_id, 0),
                "requiredLevel": profile["required_skills"].get(skill_id, 0),
                "critical": skill_id in profile["critical_skills"],
            }
        )
    return {
        "id": employee["employee_id"],
        "fullName": employee["full_name"],
        "role": employee["role"],
        "department": employee["department"],
        "avatarInitials": initials,
        "grade": {
            "current": employee["grade"],
            "target": profile["grade"],
            "targetDeadline": store.as_of_date.isoformat(),
            "goal": goal_text,
        },
        "skills": skills,
    }


@router.get("/employees", response_model=list[Employee], response_model_by_alias=True)
def get_employees(request: Request) -> list[dict[str, Any]]:
    store = _store(request)
    return [_employee_response(store, employee) for employee in store.all_employees().values()]


@router.get("/employees/{employee_id}", response_model=Employee, response_model_by_alias=True)
def get_employee(employee_id: str, request: Request) -> dict[str, Any]:
    store = _store(request)
    return _employee_response(store, _employee_or_404(store, employee_id))


@router.get("/employees/{employee_id}/trajectory", response_model=Trajectory, response_model_by_alias=True)
def get_trajectory(employee_id: str, request: Request) -> dict[str, Any]:
    store = _store(request)
    return trajectory(store, _employee_or_404(store, employee_id))


@router.get(
    "/employees/{employee_id}/recommendations",
    response_model=list[Recommendation],
    response_model_by_alias=True,
)
def get_recommendations(employee_id: str, request: Request) -> list[dict[str, Any]]:
    store = _store(request)
    return recommendations(store, _employee_or_404(store, employee_id))


def _complete(store: DataStore, employee_id: str, event_id: str) -> dict[str, bool]:
    employee = _employee_or_404(store, employee_id)
    event = store.events.get(event_id)
    if not event:
        raise APIError(404, "EVENT_NOT_FOUND", f"Event {event_id} was not found")
    if not is_eligible(store, employee, event):
        raise APIError(
            422,
            "EVENT_NOT_ELIGIBLE",
            f"Event {event_id} is not eligible for employee {employee_id}",
        )
    store.add_completion(employee_id, event_id)
    return {"success": True}


@router.post(
    "/employees/{employee_id}/complete/{event_id}",
    response_model=CompletionResult,
)
def complete_event(employee_id: str, event_id: str, request: Request) -> dict[str, bool]:
    return _complete(_store(request), employee_id, event_id)


@router.get("/employees/{employee_id}/activities", response_model=list[ActivityHistoryEntry], response_model_by_alias=True)
def get_activities(employee_id: str, request: Request) -> list[dict[str, Any]]:
    store = _store(request)
    _employee_or_404(store, employee_id)
    result = []
    for row in store.all_history():
        if row["employee_id"] != employee_id:
            continue
        event = store.events[row["event_id"]]
        status = "dropout" if row["status"] == "dropped" else row["status"]
        if status in {"declined", "overdue"}:
            status = "planned"
        result.append(
            {
                "id": row["record_id"],
                "employeeId": employee_id,
                "activityId": row["event_id"],
                "activityName": event["title"],
                "date": row["date"],
                "status": status,
                "format": "online" if event["format"] == "self_paced" else event["format"],
                "durationHours": event["duration_hours"],
            }
        )
    return sorted(result, key=lambda item: (item["date"], item["id"]), reverse=True)


@router.post("/recommendations/{recommendation_id}/complete", response_model=CompletionResult)
async def complete_recommendation(recommendation_id: str, request: Request) -> dict[str, bool]:
    try:
        body = await request.json()
    except Exception as exc:
        raise APIError(422, "INVALID_REQUEST", "Request body must be valid JSON") from exc
    employee_id = body.get("employeeId")
    event_id = body.get("activityId")
    if not isinstance(employee_id, str) or not isinstance(event_id, str):
        raise APIError(422, "INVALID_REQUEST", "employeeId and activityId are required")
    expected_id = f"rec-{employee_id}-{event_id}"
    if recommendation_id != expected_id:
        raise APIError(422, "RECOMMENDATION_MISMATCH", "Recommendation does not match employee and event")
    return _complete(_store(request), employee_id, event_id)


@router.get("/hr/dashboard", response_model=HRDashboard, response_model_by_alias=True)
@router.get("/hr-dashboard", response_model=HRDashboard, response_model_by_alias=True, include_in_schema=False)
def get_hr_dashboard(request: Request) -> dict[str, Any]:
    return hr_dashboard(_store(request))


@router.post("/import", response_model=ImportResult, response_model_by_alias=True)
async def import_dataset(
    request: Request,
    employees: UploadFile = File(...),
    activity_history: UploadFile = File(...),
) -> dict[str, int]:
    store = _store(request)
    employees_filename = employees.filename or "employees.json"
    history_filename = activity_history.filename or "activity_history.csv"
    try:
        prepared = prepare_import(
            store,
            await employees.read(),
            employees_filename,
            await activity_history.read(),
            history_filename,
        )
    except ImportValidationError as exc:
        raise APIError(422, exc.code, exc.message, exc.details) from exc

    store.apply_import(prepared.employees, prepared.history)
    return {
        "employeesImported": len(prepared.employees),
        "historyRecordsImported": len(prepared.history),
        "totalEmployees": len(store.all_employees()),
    }
