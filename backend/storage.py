from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
WORKBOOK_PATH = DATA_DIR / "task_manager.xlsx"

SHEETS: dict[str, list[str]] = {
    "Team Members": ["id", "name", "role", "email", "created_at"],
    "Projects": ["id", "name", "description", "status", "created_at"],
    "Tasks": [
        "id",
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "reminder_date",
        "assignee_id",
        "project_id",
        "comments",
        "history",
        "created_at",
        "updated_at",
    ],
    "Activity Logs": ["id", "timestamp", "action", "entity_type", "entity_id", "details"],
}


def ensure_workbook() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if WORKBOOK_PATH.exists():
        return
    with pd.ExcelWriter(WORKBOOK_PATH, engine="openpyxl") as writer:
        for sheet, columns in SHEETS.items():
            pd.DataFrame(columns=columns).to_excel(writer, sheet_name=sheet, index=False)


def _load_sheet(sheet: str) -> pd.DataFrame:
    ensure_workbook()
    if sheet not in SHEETS:
        raise ValueError(f"Unknown sheet: {sheet}")
    return pd.read_excel(WORKBOOK_PATH, sheet_name=sheet, dtype=str).fillna("")


def read_sheet(sheet: str) -> list[dict[str, Any]]:
    frame = _load_sheet(sheet)
    return frame.to_dict(orient="records")


def write_sheet(sheet: str, rows: list[dict[str, Any]]) -> None:
    ensure_workbook()
    columns = SHEETS[sheet]
    frame = pd.DataFrame(rows, columns=columns)
    with pd.ExcelWriter(WORKBOOK_PATH, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        frame.to_excel(writer, sheet_name=sheet, index=False)


def generate_id() -> str:
    return str(uuid4())


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def log_action(action: str, entity_type: str, entity_id: str, details: str) -> None:
    logs = read_sheet("Activity Logs")
    logs.append(
        {
            "id": generate_id(),
            "timestamp": now_iso(),
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
        }
    )
    write_sheet("Activity Logs", logs)
