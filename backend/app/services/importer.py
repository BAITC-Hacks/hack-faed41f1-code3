from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from app.schemas.import_data import ImportEmployee, ImportEmployeesDocument, ImportHistoryRecord
from app.services.data_loader import DataStore


HISTORY_COLUMNS = {
    "record_id",
    "employee_id",
    "event_id",
    "date",
    "due_date",
    "status",
    "completion_pct",
    "score",
    "feedback_rating",
    "assigned_by",
}


@dataclass(frozen=True)
class ImportValidationError(ValueError):
    code: str
    message: str
    details: dict[str, Any]


@dataclass(frozen=True)
class PreparedImport:
    employees: list[dict[str, Any]]
    history: list[dict[str, Any]]


def _safe_errors(exc: ValidationError) -> list[dict[str, str]]:
    return [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]


def _decode(content: bytes, filename: str) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ImportValidationError(
            "IMPORT_INVALID_ENCODING",
            f"{filename} must be UTF-8 encoded",
            {"file": filename},
        ) from exc


def _parse_employees(content: bytes, filename: str) -> list[ImportEmployee]:
    text = _decode(content, filename)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ImportValidationError(
            "IMPORT_INVALID_JSON",
            f"{filename} is not valid JSON",
            {"file": filename, "line": exc.lineno, "column": exc.colno},
        ) from exc

    try:
        document = ImportEmployeesDocument.model_validate(payload)
    except ValidationError as exc:
        raise ImportValidationError(
            "IMPORT_VALIDATION_ERROR",
            f"{filename} does not match the employees dataset format",
            {"file": filename, "errors": _safe_errors(exc)},
        ) from exc

    if not document.employees:
        raise ImportValidationError(
            "IMPORT_VALIDATION_ERROR",
            f"{filename} must contain at least one employee",
            {"file": filename, "field": "employees"},
        )

    employees: list[ImportEmployee] = []
    for index, raw_employee in enumerate(document.employees):
        employee_id = raw_employee.get("employee_id") if isinstance(raw_employee, dict) else None
        try:
            employees.append(ImportEmployee.model_validate(raw_employee))
        except ValidationError as exc:
            details: dict[str, Any] = {
                "file": filename,
                "employee_index": index,
                "errors": _safe_errors(exc),
            }
            if employee_id:
                details["employee_id"] = employee_id
            raise ImportValidationError(
                "IMPORT_VALIDATION_ERROR",
                f"Employee at index {index} in {filename} is invalid",
                details,
            ) from exc
    return employees


def _parse_history(content: bytes, filename: str) -> list[tuple[int, ImportHistoryRecord]]:
    text = _decode(content, filename)
    reader = csv.DictReader(io.StringIO(text, newline=""))
    if reader.fieldnames is None:
        raise ImportValidationError(
            "IMPORT_VALIDATION_ERROR",
            f"{filename} must contain a CSV header",
            {"file": filename, "line": 1},
        )

    missing_columns = sorted(HISTORY_COLUMNS.difference(reader.fieldnames))
    if missing_columns:
        raise ImportValidationError(
            "IMPORT_VALIDATION_ERROR",
            f"{filename} is missing required columns",
            {"file": filename, "line": 1, "missing_fields": missing_columns},
        )

    records: list[tuple[int, ImportHistoryRecord]] = []
    for line_number, raw_record in enumerate(reader, start=2):
        if None in raw_record:
            raise ImportValidationError(
                "IMPORT_VALIDATION_ERROR",
                f"CSV row {line_number} in {filename} has too many columns",
                {"file": filename, "line": line_number},
            )
        record_id = raw_record.get("record_id")
        try:
            record = ImportHistoryRecord.model_validate(raw_record)
        except ValidationError as exc:
            details: dict[str, Any] = {
                "file": filename,
                "line": line_number,
                "errors": _safe_errors(exc),
            }
            if record_id:
                details["record_id"] = record_id
            raise ImportValidationError(
                "IMPORT_VALIDATION_ERROR",
                f"CSV row {line_number} in {filename} is invalid",
                details,
            ) from exc
        records.append((line_number, record))
    return records


def prepare_import(
    store: DataStore,
    employees_content: bytes,
    employees_filename: str,
    history_content: bytes,
    history_filename: str,
) -> PreparedImport:
    employees = _parse_employees(employees_content, employees_filename)
    history = _parse_history(history_content, history_filename)

    known_employees = store.all_employees()
    imported_ids: set[str] = set()
    for employee in employees:
        employee_id = employee.employee_id
        if employee_id in imported_ids:
            raise ImportValidationError(
                "IMPORT_DUPLICATE_EMPLOYEE_ID",
                f"Employee {employee_id} appears more than once in {employees_filename}",
                {"file": employees_filename, "employee_id": employee_id},
            )
        if employee_id in known_employees:
            raise ImportValidationError(
                "IMPORT_EMPLOYEE_ID_CONFLICT",
                f"Employee {employee_id} is already loaded",
                {"file": employees_filename, "employee_id": employee_id},
            )
        imported_ids.add(employee_id)

    all_employee_ids = set(known_employees).union(imported_ids)
    for employee in employees:
        if (employee.role, employee.grade) not in store.role_profiles:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_ROLE_GRADE",
                f"Employee {employee.employee_id} has an unknown role/grade combination",
                {"file": employees_filename, "employee_id": employee.employee_id},
            )
        if employee.manager_id and employee.manager_id not in all_employee_ids:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_MANAGER_ID",
                f"Manager {employee.manager_id} for employee {employee.employee_id} was not found",
                {
                    "file": employees_filename,
                    "employee_id": employee.employee_id,
                    "manager_id": employee.manager_id,
                },
            )
        unknown_skills = sorted(set(employee.skills).difference(store.skills))
        if unknown_skills:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_SKILL_ID",
                f"Employee {employee.employee_id} references unknown skills",
                {
                    "file": employees_filename,
                    "employee_id": employee.employee_id,
                    "skill_ids": unknown_skills,
                },
            )
        if employee.career_goal and (
            employee.career_goal.target_role,
            employee.career_goal.target_grade,
        ) not in store.role_profiles:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_CAREER_GOAL",
                f"Employee {employee.employee_id} has an unknown career goal",
                {"file": employees_filename, "employee_id": employee.employee_id},
            )

    known_record_ids = {row["record_id"] for row in store.all_history()}
    imported_record_ids: set[str] = set()
    for line_number, record in history:
        if record.record_id in known_record_ids or record.record_id in imported_record_ids:
            raise ImportValidationError(
                "IMPORT_RECORD_ID_CONFLICT",
                f"History record {record.record_id} is already loaded or duplicated",
                {"file": history_filename, "line": line_number, "record_id": record.record_id},
            )
        imported_record_ids.add(record.record_id)
        if record.employee_id not in all_employee_ids:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_EMPLOYEE_ID",
                f"History record {record.record_id} references unknown employee {record.employee_id}",
                {
                    "file": history_filename,
                    "line": line_number,
                    "record_id": record.record_id,
                    "employee_id": record.employee_id,
                },
            )
        if record.event_id not in store.events:
            raise ImportValidationError(
                "IMPORT_UNKNOWN_EVENT_ID",
                f"History record {record.record_id} references unknown event {record.event_id}",
                {
                    "file": history_filename,
                    "line": line_number,
                    "record_id": record.record_id,
                    "event_id": record.event_id,
                },
            )

    return PreparedImport(
        employees=[employee.model_dump(mode="json") for employee in employees],
        history=[record.to_store_row() for _, record in history],
    )
