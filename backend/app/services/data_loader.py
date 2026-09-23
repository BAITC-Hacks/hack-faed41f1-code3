from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any


class DatasetValidationError(ValueError):
    pass


def _find_one(root: Path, filename: str) -> Path:
    matches = sorted(path for path in root.rglob(filename) if path.is_file())
    if len(matches) != 1:
        raise DatasetValidationError(
            f"Expected exactly one {filename} below {root}, found {len(matches)}"
        )
    return matches[0]


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


@dataclass
class DataStore:
    as_of_date: date
    employees: dict[str, dict[str, Any]]
    events: dict[str, dict[str, Any]]
    skills: dict[str, dict[str, Any]]
    role_profiles: dict[tuple[str, str], dict[str, Any]]
    history: list[dict[str, Any]]
    runtime_history: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def load(cls, data_root: Path) -> "DataStore":
        employee_doc = _load_json(_find_one(data_root, "employees.json"))
        event_doc = _load_json(_find_one(data_root, "events.json"))
        skill_doc = _load_json(_find_one(data_root, "skills.json"))
        history_path = _find_one(data_root, "activity_history.csv")
        with history_path.open(encoding="utf-8-sig", newline="") as source:
            history = list(csv.DictReader(source))

        dates = {
            document.get("meta", {}).get("as_of_date")
            for document in (employee_doc, event_doc, skill_doc)
        }
        if len(dates) != 1 or None in dates:
            raise DatasetValidationError("Dataset meta.as_of_date values must exist and match")

        employees = cls._index(employee_doc.get("employees", []), "employee_id")
        events = cls._index(event_doc.get("events", []), "event_id")
        skills = cls._index(skill_doc.get("skills", []), "skill_id")
        profiles = {
            (profile["role"], profile["grade"]): profile
            for profile in skill_doc.get("role_profiles", [])
        }
        store = cls(date.fromisoformat(dates.pop()), employees, events, skills, profiles, history)
        store.validate()
        return store

    @staticmethod
    def _index(items: list[dict[str, Any]], key: str) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for item in items:
            identifier = item.get(key)
            if not identifier or identifier in result:
                raise DatasetValidationError(f"Missing or duplicate {key}: {identifier!r}")
            result[identifier] = item
        return result

    def validate(self) -> None:
        valid_statuses = {"completed", "in_progress", "dropped", "no_show", "declined", "overdue"}
        for employee in self.employees.values():
            if (employee["role"], employee["grade"]) not in self.role_profiles:
                raise DatasetValidationError(f"Unknown role/grade for {employee['employee_id']}")
            manager = employee.get("manager_id")
            if manager and manager not in self.employees:
                raise DatasetValidationError(f"Unknown manager_id {manager}")
            self._validate_skill_ids(employee.get("skills", {}), employee["employee_id"])
        for profile in self.role_profiles.values():
            self._validate_skill_ids(profile.get("required_skills", {}), f"{profile['role']}/{profile['grade']}")
            self._validate_skill_ids(profile.get("critical_skills", []), f"{profile['role']}/{profile['grade']}")
        for event in self.events.values():
            self._validate_skill_ids(event.get("prerequisites", {}), event["event_id"])
            self._validate_skill_ids(
                [effect.get("skill_id") for effect in event.get("develops_skills", [])],
                event["event_id"],
            )
        seen_records: set[str] = set()
        for row in self.history:
            record_id = row.get("record_id")
            if not record_id or record_id in seen_records:
                raise DatasetValidationError(f"Missing or duplicate record_id: {record_id!r}")
            seen_records.add(record_id)
            if row.get("employee_id") not in self.employees:
                raise DatasetValidationError(f"Unknown employee_id in {record_id}")
            if row.get("event_id") not in self.events:
                raise DatasetValidationError(f"Unknown event_id in {record_id}")
            if row.get("status") not in valid_statuses:
                raise DatasetValidationError(f"Unknown status in {record_id}")

    def _validate_skill_ids(self, references: Any, owner: str) -> None:
        identifiers = references.keys() if isinstance(references, dict) else references
        for skill_id in identifiers:
            if skill_id not in self.skills:
                raise DatasetValidationError(f"Unknown skill_id {skill_id!r} in {owner}")

    def all_history(self) -> list[dict[str, Any]]:
        return [*self.history, *self.runtime_history]

    def add_completion(self, employee_id: str, event_id: str) -> None:
        self.runtime_history.append(
            {
                "record_id": f"MEM_{len(self.runtime_history) + 1:06d}",
                "employee_id": employee_id,
                "event_id": event_id,
                "date": self.as_of_date.isoformat(),
                "due_date": "",
                "status": "completed",
                "completion_pct": "100",
                "score": "",
                "feedback_rating": "",
                "assigned_by": "self",
            }
        )
