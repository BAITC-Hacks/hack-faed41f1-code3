from __future__ import annotations

import logging
from collections import Counter
from time import monotonic
from typing import Any

from openai import OpenAI

from app.services.ai_recommender import AICandidate, rerank_with_openai
from app.services.data_loader import DataStore
from app.services.trajectory import effective_skills, target_profile


logger = logging.getLogger(__name__)


def _history_fit(store: DataStore, employee_id: str, event: dict[str, Any]) -> tuple[float, Counter[str]]:
    related_skills = {effect["skill_id"] for effect in event["develops_skills"]}
    statuses: Counter[str] = Counter()
    for row in store.all_history():
        if row["employee_id"] != employee_id:
            continue
        historic = store.events[row["event_id"]]
        historic_skills = {effect["skill_id"] for effect in historic.get("develops_skills", [])}
        if historic["type"] == event["type"] or historic["format"] == event["format"] or related_skills & historic_skills:
            statuses[row["status"]] += 1
    score = 0.5 + 0.08 * statuses["completed"] + 0.03 * statuses["in_progress"]
    score -= 0.12 * statuses["dropped"] + 0.10 * statuses["declined"]
    score -= 0.14 * statuses["no_show"] + 0.04 * statuses["overdue"]
    return max(0.0, min(1.0, score)), statuses


def is_eligible(
    store: DataStore, employee: dict[str, Any], event: dict[str, Any], levels: dict[str, float] | None = None
) -> bool:
    if event["mandatory"] or not event.get("develops_skills"):
        return False
    if employee["role"] not in event["target_roles"] or employee["grade"] not in event["target_grades"]:
        return False
    levels = levels or effective_skills(store, employee)
    if any(levels.get(skill_id, 0) < required for skill_id, required in event["prerequisites"].items()):
        return False
    completed = {
        row["event_id"] for row in store.all_history()
        if row["employee_id"] == employee["employee_id"] and row["status"] == "completed"
    }
    if event["event_id"] in completed and event["event_id"] != "EV_036":
        return False
    requirements = target_profile(store, employee)["required_skills"]
    for effect in event["develops_skills"]:
        skill_id = effect["skill_id"]
        current = levels.get(skill_id, 0)
        expected = min(current + float(effect["gain"]), float(effect["max_level"]))
        if skill_id in requirements and current < requirements[skill_id] and expected > current:
            return True
    return False


def _candidate(
    store: DataStore, employee: dict[str, Any], event: dict[str, Any], levels: dict[str, float], profile: dict[str, Any]
) -> AICandidate:
    requirements = profile["required_skills"]
    critical_skills = set(profile["critical_skills"])
    gaps = {skill_id: max(0.0, required - levels.get(skill_id, 0)) for skill_id, required in requirements.items()}
    impacts: list[dict[str, Any]] = []
    for effect in event["develops_skills"]:
        skill_id = effect["skill_id"]
        if skill_id not in requirements or gaps[skill_id] <= 0:
            continue
        current = levels.get(skill_id, 0)
        expected = min(current + float(effect["gain"]), float(effect["max_level"]))
        effective_gain = min(gaps[skill_id], max(0.0, expected - current))
        if effective_gain > 0:
            impacts.append({"effect": effect, "current": current, "expected": expected, "effective_gain": effective_gain})
    impacts.sort(key=lambda item: (-item["effective_gain"], item["effect"]["skill_id"]))
    primary = impacts[0]
    total_gap = sum(gaps.values())
    gap_reduction = sum(item["effective_gain"] for item in impacts) / total_gap if total_gap else 0.0
    critical_score = float(any(item["effect"]["skill_id"] in critical_skills for item in impacts))
    career_goal = employee.get("career_goal")
    career_score = 1.0 if career_goal and career_goal["target_role"] == profile["role"] else 0.6
    history_score, history = _history_fit(store, employee["employee_id"], event)
    sessions = sorted(session for session in event["upcoming_sessions"] if session >= store.as_of_date.isoformat())
    available = event["format"] == "self_paced" or bool(sessions)
    feasibility = 1.0 if available else 0.4
    score = round(100 * (0.40 * gap_reduction + 0.20 * critical_score + 0.15 * career_score + 0.15 * history_score + 0.10 * feasibility))
    effect, skill_id = primary["effect"], primary["effect"]["skill_id"]
    skill = store.skills[skill_id]
    gap_evidence_id = f"gap:{skill_id}"
    evidence: dict[str, dict[str, Any]] = {
        gap_evidence_id: {
            "factor": "skill_gap", "label": "Разрыв навыка",
            "fact": f"{skill['name']}: текущий уровень {primary['current']:g}, требуется {requirements[skill_id]:g}, после активности ожидается {primary['expected']:g}.",
            "skill_id": skill_id, "current": primary["current"], "required": requirements[skill_id],
            "gap": gaps[skill_id], "gain": float(effect["gain"]), "max_level": float(effect["max_level"]),
            "expected": primary["expected"], "effective_gain": primary["effective_gain"],
        },
        "career:target": {
            "factor": "career_target", "label": "Карьерная траектория",
            "fact": f"Активность сокращает разрыв для цели {profile['role']} / {profile['grade']}.",
            "target_role": profile["role"], "target_grade": profile["grade"], "has_career_goal": bool(career_goal),
        },
        "history:fit": {
            "factor": "history_fit", "label": "История участия",
            "fact": f"Похожая история: completed {history['completed']}, in_progress {history['in_progress']}, dropped {history['dropped']}, declined {history['declined']}, no_show {history['no_show']}.",
            "history_score": history_score, "completed": history["completed"], "dropped": history["dropped"],
            "declined": history["declined"], "no_show": history["no_show"], "in_progress": history["in_progress"],
            "overdue": history["overdue"], "similarity": "type_or_format_or_develops_skills",
        },
        "availability:event": {
            "factor": "availability", "label": "Доступность",
            "fact": f"Формат {event['format']}, нагрузка {event['duration_hours']:g} ч, prerequisites выполнены.",
            "format": event["format"], "duration": event["duration_hours"],
            "next_session": sessions[0] if sessions else None, "prerequisites_met": True,
        },
    }
    if skill_id in critical_skills:
        evidence[f"critical:{skill_id}"] = {
            "factor": "critical_skill", "label": "Критичный навык",
            "fact": f"{skill['name']} — критичный навык для целевого грейда.",
            "skill_id": skill_id, "critical": True,
        }
    response = {
        "id": f"rec-{employee['employee_id']}-{event['event_id']}", "employeeId": employee["employee_id"],
        "activityId": event["event_id"], "title": event["title"], "description": event["description"],
        "score": max(0, min(100, score)),
        "factors": [{"label": item["label"], "detail": item["fact"]} for item in evidence.values()],
        "skillLevels": {"skillName": skill["name"], "currentLevel": primary["current"], "expectedLevel": primary["expected"], "requiredLevel": requirements[skill_id]},
        "format": "online" if event["format"] == "self_paced" else event["format"], "durationHours": event["duration_hours"],
        "startDate": sessions[0] if sessions else store.as_of_date.isoformat(),
    }
    return AICandidate(response=response, evidence=evidence)


def rank_candidates(store: DataStore, employee: dict[str, Any], limit: int = 8) -> list[AICandidate]:
    levels, profile = effective_skills(store, employee), target_profile(store, employee)
    candidates = [_candidate(store, employee, event, levels, profile) for event in store.events.values() if is_eligible(store, employee, event, levels)]
    candidates.sort(key=lambda item: (-item.response["score"], item.response["activityId"]))
    return candidates[:limit]


def deterministic_recommendations(store: DataStore, employee: dict[str, Any], *, limit: int = 3) -> list[dict[str, Any]]:
    return [candidate.response for candidate in rank_candidates(store, employee, limit=limit)]


def recommendations(store: DataStore, employee: dict[str, Any], *, ai_client: OpenAI | None = None) -> list[dict[str, Any]]:
    started = monotonic()
    candidates = rank_candidates(store, employee, limit=8)
    fallback = [candidate.response for candidate in candidates[:3]]
    if len(candidates) < 3:
        logger.info("recommendation_source=deterministic reason=fewer_than_three_candidates employee_id=%s candidates=%d latency_ms=%d", employee["employee_id"], len(candidates), round((monotonic()-started)*1000))
        return fallback
    outcome = rerank_with_openai(employee["employee_id"], candidates, client=ai_client)
    if outcome.result is not None:
        logger.info("recommendation_source=%s result=success employee_id=%s candidates=%d latency_ms=%d", outcome.source, employee["employee_id"], len(candidates), round((monotonic()-started)*1000))
    else:
        logger.info("recommendation_source=deterministic reason=%s employee_id=%s candidates=%d latency_ms=%d", outcome.reason, employee["employee_id"], len(candidates), round((monotonic()-started)*1000))
    return outcome.result if outcome.result is not None else fallback
