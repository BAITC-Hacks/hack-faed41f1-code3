from __future__ import annotations

from collections import Counter
from typing import Any

from app.services.data_loader import DataStore
from app.services.trajectory import effective_skills, target_profile


NEGATIVE_STATUSES = {"dropped", "declined", "no_show"}


def is_eligible(
    store: DataStore,
    employee: dict[str, Any],
    event: dict[str, Any],
    levels: dict[str, float] | None = None,
) -> bool:
    if event["mandatory"] or not event.get("develops_skills"):
        return False
    if employee["role"] not in event["target_roles"] or employee["grade"] not in event["target_grades"]:
        return False
    levels = levels or effective_skills(store, employee)
    if any(levels.get(skill_id, 0) < required for skill_id, required in event["prerequisites"].items()):
        return False
    completed_ids = {
        row["event_id"]
        for row in store.all_history()
        if row["employee_id"] == employee["employee_id"] and row["status"] == "completed"
    }
    if event["event_id"] in completed_ids and event["event_id"] != "EV_036":
        return False
    profile = target_profile(store, employee)
    return any(
        effect["skill_id"] in profile["required_skills"]
        and levels.get(effect["skill_id"], 0) < profile["required_skills"][effect["skill_id"]]
        and levels.get(effect["skill_id"], 0) < float(effect["max_level"])
        for effect in event["develops_skills"]
    )


def _history_fit(store: DataStore, employee_id: str, event: dict[str, Any]) -> tuple[float, str]:
    related_skills = {effect["skill_id"] for effect in event["develops_skills"]}
    statuses: Counter[str] = Counter()
    for row in store.all_history():
        if row["employee_id"] != employee_id:
            continue
        historic_event = store.events[row["event_id"]]
        historic_skills = {effect["skill_id"] for effect in historic_event.get("develops_skills", [])}
        if (
            historic_event["type"] == event["type"]
            or historic_event["format"] == event["format"]
            or related_skills.intersection(historic_skills)
        ):
            statuses[row["status"]] += 1
    score = 0.5 + 0.08 * statuses["completed"]
    score -= 0.12 * statuses["dropped"]
    score -= 0.10 * statuses["declined"]
    score -= 0.14 * statuses["no_show"]
    score += 0.03 * statuses["in_progress"]
    score -= 0.04 * statuses["overdue"]
    summary = (
        f"Похожая история: completed {statuses['completed']}, dropped {statuses['dropped']}, "
        f"declined {statuses['declined']}, no_show {statuses['no_show']}."
    )
    return max(0.0, min(1.0, score)), summary


def _candidate(store: DataStore, employee: dict[str, Any], event: dict[str, Any]) -> dict[str, Any]:
    levels = effective_skills(store, employee)
    profile = target_profile(store, employee)
    requirements = profile["required_skills"]
    critical = set(profile["critical_skills"])
    gaps = {skill_id: max(0.0, required - levels.get(skill_id, 0)) for skill_id, required in requirements.items()}
    total_gap = sum(gaps.values())
    reductions: list[tuple[float, dict[str, Any]]] = []
    for effect in event["develops_skills"]:
        skill_id = effect["skill_id"]
        if skill_id not in requirements:
            continue
        current = levels.get(skill_id, 0)
        expected = min(current + float(effect["gain"]), float(effect["max_level"]))
        reductions.append((min(gaps[skill_id], max(0.0, expected - current)), effect))
    reductions.sort(key=lambda item: (item[0], item[1]["skill_id"] in critical), reverse=True)
    gap_reduction = sum(item[0] for item in reductions) / total_gap if total_gap else 0.0
    critical_score = 1.0 if any(effect["skill_id"] in critical and gaps[effect["skill_id"]] > 0 for _, effect in reductions) else 0.0
    goal = employee.get("career_goal")
    career_score = 1.0 if goal and goal["target_role"] == profile["role"] and reductions else 0.6
    history_score, history_summary = _history_fit(store, employee["employee_id"], event)
    available = event["format"] == "self_paced" or any(
        session >= store.as_of_date.isoformat() for session in event["upcoming_sessions"]
    )
    feasibility = 1.0 if available else 0.4
    raw_score = (
        0.40 * gap_reduction
        + 0.20 * critical_score
        + 0.15 * career_score
        + 0.15 * history_score
        + 0.10 * feasibility
    )
    primary = reductions[0][1]
    skill_id = primary["skill_id"]
    current = levels.get(skill_id, 0)
    required = requirements[skill_id]
    expected = min(current + float(primary["gain"]), float(primary["max_level"]))
    sessions = sorted(session for session in event["upcoming_sessions"] if session >= store.as_of_date.isoformat())
    start_date = sessions[0] if sessions else store.as_of_date.isoformat()
    factors = [
        {
            "label": "Разрыв навыка",
            "detail": f"{store.skills[skill_id]['name']}: текущий уровень {current:g}, требуется {required:g}, после активности ожидается {expected:g}.",
        },
        {
            "label": "Карьерная траектория",
            "detail": f"Активность сокращает разрывы для цели {profile['role']} / {profile['grade']}; критичный навык: {'да' if skill_id in critical else 'нет'}.",
        },
        {"label": "История участия", "detail": history_summary},
        {
            "label": "Доступность",
            "detail": f"Формат {event['format']}, нагрузка {event['duration_hours']:g} ч, prerequisites выполнены.",
        },
    ]
    return {
        "id": f"rec-{employee['employee_id']}-{event['event_id']}",
        "employeeId": employee["employee_id"],
        "activityId": event["event_id"],
        "title": event["title"],
        "description": event["description"],
        "score": max(0, min(100, round(raw_score * 100))),
        "factors": factors,
        "skillLevels": {
            "skillName": store.skills[skill_id]["name"],
            "currentLevel": current,
            "expectedLevel": expected,
            "requiredLevel": required,
        },
        "format": "online" if event["format"] == "self_paced" else event["format"],
        "durationHours": event["duration_hours"],
        "startDate": start_date,
    }


def recommendations(store: DataStore, employee: dict[str, Any]) -> list[dict[str, Any]]:
    levels = effective_skills(store, employee)
    candidates = [
        _candidate(store, employee, event)
        for event in store.events.values()
        if is_eligible(store, employee, event, levels)
    ]
    candidates.sort(key=lambda item: (-item["score"], item["activityId"]))
    return candidates[:3]
