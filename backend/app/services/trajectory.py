from __future__ import annotations

from datetime import date
from typing import Any

from app.services.data_loader import DataStore


GRADES = ("Junior", "Middle", "Senior", "Lead")


def effective_skills(store: DataStore, employee: dict[str, Any]) -> dict[str, float]:
    levels = {skill_id: float(level) for skill_id, level in employee.get("skills", {}).items()}
    review_date = date.fromisoformat(employee["last_review_date"])
    completed = sorted(
        (
            row
            for row in store.all_history()
            if row["employee_id"] == employee["employee_id"]
            and row["status"] == "completed"
            and date.fromisoformat(row["date"]) > review_date
        ),
        key=lambda row: (row["date"], row["record_id"]),
    )
    for row in completed:
        for effect in store.events[row["event_id"]].get("develops_skills", []):
            skill_id = effect["skill_id"]
            levels[skill_id] = min(
                levels.get(skill_id, 0) + float(effect["gain"]),
                float(effect["max_level"]),
            )
    return levels


def target_profile(store: DataStore, employee: dict[str, Any]) -> dict[str, Any]:
    goal = employee.get("career_goal")
    if goal and (goal.get("target_role"), goal.get("target_grade")) in store.role_profiles:
        return store.role_profiles[(goal["target_role"], goal["target_grade"])]
    grade_index = GRADES.index(employee["grade"])
    target_grade = GRADES[min(grade_index + 1, len(GRADES) - 1)]
    return store.role_profiles[(employee["role"], target_grade)]


def trajectory(store: DataStore, employee: dict[str, Any]) -> dict[str, Any]:
    levels = effective_skills(store, employee)
    profile = target_profile(store, employee)
    required = profile["required_skills"]
    critical = set(profile["critical_skills"])
    skills = []
    achieved = 0.0
    total = 0.0
    for skill_id, required_level in required.items():
        current = levels.get(skill_id, 0)
        achieved += min(current, required_level)
        total += required_level
        skills.append(
            {
                "skillId": skill_id,
                "skillName": store.skills[skill_id]["name"],
                "currentLevel": current,
                "requiredLevel": required_level,
                "gap": max(0, required_level - current),
                "critical": skill_id in critical,
            }
        )
    skills.sort(key=lambda item: (not item["critical"], -item["gap"], item["skillName"]))
    return {
        "employeeId": employee["employee_id"],
        "currentRole": employee["role"],
        "currentGrade": employee["grade"],
        "targetRole": profile["role"],
        "targetGrade": profile["grade"],
        "asOfDate": store.as_of_date.isoformat(),
        "progressPercentage": round(100 * achieved / total) if total else 100,
        "skills": skills,
    }
