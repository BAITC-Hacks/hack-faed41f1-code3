from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from typing import Any

from app.services.data_loader import DataStore
from app.services.recommender import recommendations
from app.services.trajectory import effective_skills, target_profile


def hr_dashboard(store: DataStore) -> dict[str, Any]:
    gap_counts: Counter[str] = Counter()
    without_recommendations = []
    for employee in store.all_employees().values():
        levels = effective_skills(store, employee)
        profile = target_profile(store, employee)
        for skill_id, required in profile["required_skills"].items():
            if levels.get(skill_id, 0) < required:
                gap_counts[skill_id] += 1
        if not recommendations(store, employee):
            employee_history = [
                row for row in store.all_history() if row["employee_id"] == employee["employee_id"]
            ]
            days = -1
            if employee_history:
                last = max(date.fromisoformat(row["date"]) for row in employee_history)
                days = max(0, (store.as_of_date - last).days)
            without_recommendations.append(
                {
                    "employeeId": employee["employee_id"],
                    "fullName": employee["full_name"],
                    "department": employee["department"],
                    "daysSinceLastActivity": days,
                }
            )

    statuses = Counter(row["status"] for row in store.all_history())
    event_stats: dict[str, Counter[str]] = defaultdict(Counter)
    for row in store.all_history():
        event_stats[row["event_id"]]["participants"] += 1
        if row["status"] == "completed":
            event_stats[row["event_id"]]["completed"] += 1
    participation = []
    for event_id, counts in event_stats.items():
        participants = counts["participants"]
        participation.append(
            {
                "activityName": store.events[event_id]["title"],
                "participants": participants,
                "completionRate": round(100 * counts["completed"] / participants),
            }
        )
    participation.sort(key=lambda item: (-item["participants"], item["activityName"]))
    top_gaps = []
    for skill_id, count in sorted(gap_counts.items(), key=lambda item: (-item[1], item[0]))[:6]:
        skill = store.skills[skill_id]
        top_gaps.append(
            {
                "skillName": skill["name"],
                "category": "hard" if skill["type"] == "hard" else "soft",
                "employeesAffected": count,
            }
        )
    return {
        "topSkillGaps": top_gaps,
        "employeesWithoutRecommendation": without_recommendations,
        "statusBreakdown": {
            "completed": statuses["completed"],
            "dropout": statuses["dropped"],
            "dropped": statuses["dropped"],
            "declined": statuses["declined"],
            "noShow": statuses["no_show"],
            "inProgress": statuses["in_progress"],
            "planned": 0,
            "overdue": statuses["overdue"],
        },
        "participationByActivity": participation[:8],
        "totalEmployees": len(store.all_employees()),
    }
