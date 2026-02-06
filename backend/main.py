from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from storage import generate_id, log_action, now_iso, read_sheet, write_sheet

app = FastAPI(title="Local Task Manager")

raw_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in raw_allowed_origins.split(",") if origin.strip()]
allow_all_origins = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TeamMemberCreate(BaseModel):
    name: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)


class TeamMemberUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    email: str | None = None


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    status: str = "Active"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


TaskStatus = Literal["Pending", "In Progress", "Completed", "Blocked"]
TaskPriority = Literal["Low", "Medium", "High", "Urgent"]


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    status: TaskStatus = "Pending"
    priority: TaskPriority = "Medium"
    due_date: str | None = None
    reminder_date: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    comments: str = ""
    updated_by: str = "system"


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_date: str | None = None
    reminder_date: str | None = None
    assignee_id: str | None = None
    project_id: str | None = None
    comments: str | None = None
    updated_by: str = "system"


def _find_by_id(rows: list[dict[str, Any]], item_id: str) -> dict[str, Any] | None:
    for row in rows:
        if row["id"] == item_id:
            return row
    return None


@app.get("/team-members")
def list_team_members() -> list[dict[str, Any]]:
    members = read_sheet("Team Members")
    tasks = read_sheet("Tasks")
    for member in members:
        workload = sum(
            1
            for task in tasks
            if task["assignee_id"] == member["id"] and task["status"] != "Completed"
        )
        member["workload"] = workload
    return members


@app.post("/team-members")
def create_team_member(payload: TeamMemberCreate) -> dict[str, Any]:
    members = read_sheet("Team Members")
    member = {
        "id": generate_id(),
        "name": payload.name,
        "role": payload.role,
        "email": payload.email,
        "created_at": now_iso(),
    }
    members.append(member)
    write_sheet("Team Members", members)
    log_action("create", "team_member", member["id"], f"Added {member['name']}")
    return member


@app.put("/team-members/{member_id}")
def update_team_member(member_id: str, payload: TeamMemberUpdate) -> dict[str, Any]:
    members = read_sheet("Team Members")
    member = _find_by_id(members, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        member[key] = value
    write_sheet("Team Members", members)
    log_action("update", "team_member", member_id, f"Updated {member['name']}")
    return member


@app.delete("/team-members/{member_id}")
def delete_team_member(member_id: str) -> dict[str, Any]:
    members = read_sheet("Team Members")
    member = _find_by_id(members, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    updated = [row for row in members if row["id"] != member_id]
    write_sheet("Team Members", updated)
    log_action("delete", "team_member", member_id, f"Removed {member['name']}")
    return {"status": "deleted"}


@app.get("/projects")
def list_projects() -> list[dict[str, Any]]:
    return read_sheet("Projects")


@app.post("/projects")
def create_project(payload: ProjectCreate) -> dict[str, Any]:
    projects = read_sheet("Projects")
    project = {
        "id": generate_id(),
        "name": payload.name,
        "description": payload.description,
        "status": payload.status,
        "created_at": now_iso(),
    }
    projects.append(project)
    write_sheet("Projects", projects)
    log_action("create", "project", project["id"], f"Added {project['name']}")
    return project


@app.put("/projects/{project_id}")
def update_project(project_id: str, payload: ProjectUpdate) -> dict[str, Any]:
    projects = read_sheet("Projects")
    project = _find_by_id(projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        project[key] = value
    write_sheet("Projects", projects)
    log_action("update", "project", project_id, f"Updated {project['name']}")
    return project


@app.delete("/projects/{project_id}")
def delete_project(project_id: str) -> dict[str, Any]:
    projects = read_sheet("Projects")
    project = _find_by_id(projects, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    updated = [row for row in projects if row["id"] != project_id]
    write_sheet("Projects", updated)
    log_action("delete", "project", project_id, f"Removed {project['name']}")
    return {"status": "deleted"}


@app.get("/tasks")
def list_tasks(
    assignee_id: str | None = None,
    project_id: str | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    due_before: str | None = None,
    due_after: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    tasks = read_sheet("Tasks")
    filtered = tasks
    if assignee_id:
        filtered = [task for task in filtered if task["assignee_id"] == assignee_id]
    if project_id:
        filtered = [task for task in filtered if task["project_id"] == project_id]
    if status:
        filtered = [task for task in filtered if task["status"] == status]
    if priority:
        filtered = [task for task in filtered if task["priority"] == priority]
    if due_before:
        filtered = [
            task
            for task in filtered
            if task["due_date"] and task["due_date"] <= due_before
        ]
    if due_after:
        filtered = [
            task for task in filtered if task["due_date"] and task["due_date"] >= due_after
        ]
    if search:
        needle = search.lower()
        filtered = [
            task
            for task in filtered
            if needle in task["title"].lower()
            or needle in task["description"].lower()
            or needle in task["comments"].lower()
        ]
    return filtered


@app.post("/tasks")
def create_task(payload: TaskCreate) -> dict[str, Any]:
    tasks = read_sheet("Tasks")
    timestamp = now_iso()
    history_entry = f"{timestamp} - {payload.updated_by} created task"
    task = {
        "id": generate_id(),
        "title": payload.title,
        "description": payload.description,
        "status": payload.status,
        "priority": payload.priority,
        "due_date": payload.due_date or "",
        "reminder_date": payload.reminder_date or "",
        "assignee_id": payload.assignee_id or "",
        "project_id": payload.project_id or "",
        "comments": payload.comments,
        "history": history_entry,
        "created_at": timestamp,
        "updated_at": timestamp,
    }
    tasks.append(task)
    write_sheet("Tasks", tasks)
    log_action("create", "task", task["id"], f"Added {task['title']}")
    return task


@app.put("/tasks/{task_id}")
def update_task(task_id: str, payload: TaskUpdate) -> dict[str, Any]:
    tasks = read_sheet("Tasks")
    task = _find_by_id(tasks, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_none=True)
    for key, value in updates.items():
        if key == "updated_by":
            continue
        task[key] = value
    timestamp = now_iso()
    history_entry = f"{timestamp} - {payload.updated_by} updated task"
    task["history"] = f"{task['history']}\n{history_entry}".strip()
    task["updated_at"] = timestamp
    write_sheet("Tasks", tasks)
    log_action("update", "task", task_id, f"Updated {task['title']}")
    return task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str) -> dict[str, Any]:
    tasks = read_sheet("Tasks")
    task = _find_by_id(tasks, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = [row for row in tasks if row["id"] != task_id]
    write_sheet("Tasks", updated)
    log_action("delete", "task", task_id, f"Removed {task['title']}")
    return {"status": "deleted"}


@app.get("/metrics")
def metrics() -> dict[str, Any]:
    tasks = read_sheet("Tasks")
    projects = read_sheet("Projects")
    members = read_sheet("Team Members")

    completed_today = 0
    today = datetime.utcnow().date().isoformat()
    for task in tasks:
        if task["status"] == "Completed" and task["updated_at"].startswith(today):
            completed_today += 1

    pending = sum(1 for task in tasks if task["status"] != "Completed")
    completed = sum(1 for task in tasks if task["status"] == "Completed")
    overdue = sum(
        1
        for task in tasks
        if task["due_date"]
        and task["due_date"] < today
        and task["status"] != "Completed"
    )

    project_progress = []
    for project in projects:
        project_tasks = [task for task in tasks if task["project_id"] == project["id"]]
        total = len(project_tasks)
        done = sum(1 for task in project_tasks if task["status"] == "Completed")
        progress = int((done / total) * 100) if total else 0
        project_progress.append(
            {"project_id": project["id"], "name": project["name"], "progress": progress}
        )

    member_productivity = []
    for member in members:
        member_tasks = [task for task in tasks if task["assignee_id"] == member["id"]]
        done = sum(1 for task in member_tasks if task["status"] == "Completed")
        member_productivity.append(
            {"member_id": member["id"], "name": member["name"], "completed": done}
        )

    return {
        "completed_today": completed_today,
        "pending_vs_completed": {"pending": pending, "completed": completed},
        "overdue": overdue,
        "project_progress": project_progress,
        "member_productivity": member_productivity,
    }


@app.get("/activity")
def list_activity(
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    logs = read_sheet("Activity Logs")
    return list(reversed(logs))[:limit]
