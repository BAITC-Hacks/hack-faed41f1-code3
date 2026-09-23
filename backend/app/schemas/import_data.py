from __future__ import annotations

import re
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _validate_iso_date(value: str, *, allow_empty: bool = False) -> str:
    if allow_empty and value == "":
        return value
    if not isinstance(value, str) or not ISO_DATE_PATTERN.fullmatch(value):
        raise ValueError("must use YYYY-MM-DD format")
    try:
        date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("must be a valid calendar date in YYYY-MM-DD format") from exc
    return value


class ImportCareerGoal(BaseModel):
    target_role: str = Field(min_length=1)
    target_grade: str = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")


class ImportEmployee(BaseModel):
    employee_id: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    department: str = Field(min_length=1)
    role: str = Field(min_length=1)
    grade: str = Field(min_length=1)
    manager_id: str | None
    hire_date: str
    tenure_months: int = Field(ge=0)
    work_format: Literal["office", "hybrid", "remote"]
    preferred_language: Literal["kk", "ru", "en"]
    career_goal: ImportCareerGoal | None
    skills: dict[str, float]
    last_review_date: str

    model_config = ConfigDict(extra="forbid")

    @field_validator("hire_date", "last_review_date")
    @classmethod
    def validate_dates(cls, value: str) -> str:
        return _validate_iso_date(value)

    @field_validator("skills")
    @classmethod
    def validate_skill_levels(cls, value: dict[str, float]) -> dict[str, float]:
        for skill_id, level in value.items():
            if not 0 <= level <= 5:
                raise ValueError(f"skill {skill_id} must be between 0 and 5")
        return value


class ImportEmployeesDocument(BaseModel):
    employees: list[dict[str, Any]]

    model_config = ConfigDict(extra="ignore")


class ImportHistoryRecord(BaseModel):
    record_id: str = Field(min_length=1)
    employee_id: str = Field(min_length=1)
    event_id: str = Field(min_length=1)
    date: str
    due_date: str = ""
    status: Literal["completed", "in_progress", "dropped", "no_show", "declined", "overdue"]
    completion_pct: int = Field(ge=0, le=100)
    score: int | None = Field(default=None, ge=0, le=100)
    feedback_rating: int | None = Field(default=None, ge=1, le=5)
    assigned_by: Literal["self", "manager", "hr"]

    model_config = ConfigDict(extra="forbid")

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        return _validate_iso_date(value)

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, value: str) -> str:
        return _validate_iso_date(value, allow_empty=True)

    @field_validator("score", "feedback_rating", mode="before")
    @classmethod
    def empty_number_is_none(cls, value: Any) -> Any:
        return None if value == "" else value

    def to_store_row(self) -> dict[str, Any]:
        row = self.model_dump()
        row["score"] = "" if self.score is None else str(self.score)
        row["feedback_rating"] = "" if self.feedback_rating is None else str(self.feedback_rating)
        row["completion_pct"] = str(self.completion_pct)
        return row


class ImportResult(BaseModel):
    employees_imported: int = Field(alias="employeesImported")
    history_records_imported: int = Field(alias="historyRecordsImported")
    total_employees: int = Field(alias="totalEmployees")

    model_config = ConfigDict(populate_by_name=True)
