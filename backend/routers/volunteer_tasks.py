"""
Volunteer Seva / Work Assignment Management.

Separate from DutyAssignment on purpose:
  - DutyAssignment = shift + QR check-in/check-out attendance.
  - VolunteerTask   = free-text seva/work a committee member (ADMIN or an
    APPROVED VOLUNTEER) assigns to a volunteer — "who is doing which
    work, on which date, at what time" — with no fixed list of work
    names, plus a status workflow, priority, and an audit trail.

Permission model (enforced here, not just in the frontend):
  - Every endpoint in this router requires ADMIN or an approved
    VOLUNTEER (get_current_volunteer_or_admin), EXCEPT /my-tasks,
    which any authenticated user can call — it only ever returns the
    caller's own volunteer tasks (empty list for a DEVOTEE, who has no
    Volunteer record).
  - A User only carries role=="VOLUNTEER" once their Volunteer
    application has been APPROVED (see routers/volunteers.py
    update_volunteer), so get_current_volunteer_or_admin already
    excludes PENDING/REJECTED volunteers with no extra lookup needed.
  - Both ADMIN and APPROVED VOLUNTEER get the exact same read/write
    permissions here — neither is restricted to only their own work in
    the main management endpoints. /my-tasks is a separate, personal
    "My Assigned Works" view on top of that, not a restriction.

Notifications: every create/update/cancel/status-change writes a
Notification (see routers/notifications.py) for the AFFECTED
volunteer's user account, so they see "You've been assigned a new
Seva", "Your seva was updated", etc. in their own notifications list.

This file does not touch DutyAssignment, user deletion, role changes,
expenses, service areas, or any other feature outside Work/Seva.
"""

import datetime
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from backend.auth import get_current_user, get_current_volunteer_or_admin
from backend.database import get_db
from backend.models import User, Volunteer, VolunteerTask
from backend.routers.notifications import create_notification
from backend.schemas import (
    VolunteerTaskCreate,
    VolunteerTaskResponse,
    VolunteerTaskStatsResponse,
    VolunteerTaskUpdate,
)

router = APIRouter(prefix="/api/volunteer-tasks", tags=["volunteer-tasks"])

VALID_PRIORITIES = ("LOW", "NORMAL", "HIGH", "URGENT")
VALID_STATUSES = ("ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED")


# ------------------------------------------------------------------
# Small request schemas for the PATCH endpoints (kept local to this
# router so it works standalone even if schemas.py hasn't been updated
# with them).
# ------------------------------------------------------------------

class VolunteerTaskStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v


class VolunteerTaskCancelUpdate(BaseModel):
    cancellation_reason: str

    @field_validator("cancellation_reason")
    @classmethod
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise ValueError("cancellation_reason is required")
        return v.strip()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _to_response(task: VolunteerTask) -> VolunteerTaskResponse:
    return VolunteerTaskResponse(
        id=task.id,
        volunteer_id=task.volunteer_id,
        volunteer_name=(
            task.volunteer.user.full_name
            if task.volunteer and task.volunteer.user
            else "Unknown"
        ),
        task_title=task.task_title,
        description=task.description,
        service_area=task.service_area,
        duty_date=task.duty_date,
        start_time=task.start_time,
        end_time=task.end_time,
        location=task.location,
        priority=task.priority,
        status=task.status,
        cancellation_reason=task.cancellation_reason,
        assigned_by=task.assigned_by,
        assigned_by_name=(
            task.assigned_by_user.full_name if task.assigned_by_user else "Committee"
        ),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _parse_time(value: Optional[str]) -> Optional[datetime.time]:
    """Parses 'HH:MM' (24h, from <input type='time'>). Returns None on a
    missing/unrecognized value, in which case callers skip the check
    that depended on it rather than raising."""
    if not value:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    return None


def _validate_time_order(start_time: str, end_time: Optional[str]) -> None:
    if not end_time:
        return
    start = _parse_time(start_time)
    end = _parse_time(end_time)
    if start is not None and end is not None and end <= start:
        raise HTTPException(status_code=400, detail="end_time must be later than start_time")


def _find_conflicts(
    db: Session,
    volunteer_id: int,
    duty_date: str,
    start_time: str,
    end_time: Optional[str],
    exclude_task_id: Optional[int] = None,
) -> List[VolunteerTask]:
    new_start = _parse_time(start_time)
    if new_start is None:
        return []
    new_end = _parse_time(end_time) or datetime.time(23, 59)

    q = db.query(VolunteerTask).filter(
        VolunteerTask.volunteer_id == volunteer_id,
        VolunteerTask.duty_date == duty_date,
        VolunteerTask.status != "CANCELLED",
    )
    if exclude_task_id is not None:
        q = q.filter(VolunteerTask.id != exclude_task_id)

    conflicts = []
    for existing in q.all():
        existing_start = _parse_time(existing.start_time)
        if existing_start is None:
            continue
        existing_end = _parse_time(existing.end_time) or datetime.time(23, 59)
        if new_start < existing_end and existing_start < new_end:
            conflicts.append(existing)
    return conflicts


def _conflict_payload(volunteer_name: str, duty_date: str, conflicts: List[VolunteerTask]) -> dict:
    return {
        "message": (
            f"{volunteer_name} already has {len(conflicts)} overlapping "
            f"work assignment(s) on {duty_date}."
        ),
        "conflicts": [
            {
                "id": c.id,
                "task_title": c.task_title,
                "start_time": c.start_time,
                "end_time": c.end_time,
            }
            for c in conflicts
        ],
    }


def _append_audit(task: VolunteerTask, action: str, actor: User, details: Optional[str] = None) -> None:
    if not hasattr(task, "audit_log_json"):
        return
    try:
        log = json.loads(task.audit_log_json) if task.audit_log_json else []
    except (ValueError, TypeError):
        log = []
    log.append(
        {
            "action": action,
            "by": actor.id,
            "by_name": actor.full_name,
            "at": datetime.datetime.utcnow().isoformat(),
            "details": details,
        }
    )
    task.audit_log_json = json.dumps(log)


def _notify_volunteer(db: Session, task: VolunteerTask, title: str, message: str, notif_type: str) -> None:
    """Notifies the volunteer this task belongs to. Safe no-op if the
    volunteer/user record can't be resolved for any reason."""
    if not task.volunteer or not task.volunteer.user_id:
        return
    create_notification(
        db,
        user_id=task.volunteer.user_id,
        title=title,
        message=message,
        notif_type=notif_type,
        related_task_id=task.id,
    )


def _get_task_or_404(db: Session, task_id: int) -> VolunteerTask:
    task = db.query(VolunteerTask).filter(VolunteerTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Work assignment not found")
    return task


def _get_approved_volunteer_or_error(db: Session, volunteer_id: int) -> Volunteer:
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")
    if volunteer.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Work can only be assigned to an APPROVED volunteer")
    return volunteer


# ------------------------------------------------------------------
# Fixed-path routes FIRST — must be declared before /{task_id} so
# FastAPI doesn't try to parse "my-tasks" / "stats" / "volunteer" as a
# task_id path parameter.
# ------------------------------------------------------------------

@router.get("/my-tasks", response_model=List[VolunteerTaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """'My Assigned Works' — any authenticated user may call this, but it
    only ever returns the caller's own volunteer tasks. A DEVOTEE has no
    Volunteer record, so this simply returns an empty list for them."""
    my_volunteer = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    if not my_volunteer:
        return []

    tasks = (
        db.query(VolunteerTask)
        .filter(VolunteerTask.volunteer_id == my_volunteer.id)
        .order_by(VolunteerTask.duty_date.asc(), VolunteerTask.start_time.asc())
        .all()
    )
    return [_to_response(t) for t in tasks]


@router.get("/stats", response_model=VolunteerTaskStatsResponse)
def get_task_stats(
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    today_str = datetime.date.today().isoformat()
    return VolunteerTaskStatsResponse(
        total_volunteers=db.query(Volunteer).filter(Volunteer.status == "APPROVED").count(),
        total_active_works=db.query(VolunteerTask)
        .filter(VolunteerTask.status.in_(["ASSIGNED", "IN_PROGRESS"]))
        .count(),
        todays_works=db.query(VolunteerTask).filter(VolunteerTask.duty_date == today_str).count(),
        completed_works=db.query(VolunteerTask).filter(VolunteerTask.status == "COMPLETED").count(),
        pending_works=db.query(VolunteerTask).filter(VolunteerTask.status == "ASSIGNED").count(),
    )


@router.get("/volunteer/{volunteer_id}", response_model=List[VolunteerTaskResponse])
def get_tasks_for_volunteer(
    volunteer_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    tasks = (
        db.query(VolunteerTask)
        .filter(VolunteerTask.volunteer_id == volunteer_id)
        .order_by(VolunteerTask.duty_date.asc(), VolunteerTask.start_time.asc())
        .all()
    )
    return [_to_response(t) for t in tasks]


# ------------------------------------------------------------------
# Collection routes
# ------------------------------------------------------------------

@router.get("", response_model=List[VolunteerTaskResponse])
def list_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    volunteer_id: Optional[int] = Query(None),
    service_area: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    """Full Work/Seva Management table. ADMIN and APPROVED VOLUNTEER see
    the exact same complete list — neither is scoped to their own work
    here; that's what /my-tasks is for."""
    q = db.query(VolunteerTask)
    if status:
        q = q.filter(VolunteerTask.status == status)
    if priority:
        q = q.filter(VolunteerTask.priority == priority)
    if volunteer_id:
        q = q.filter(VolunteerTask.volunteer_id == volunteer_id)
    if service_area:
        q = q.filter(VolunteerTask.service_area == service_area)
    if date:
        q = q.filter(VolunteerTask.duty_date == date)

    tasks = q.order_by(VolunteerTask.duty_date.asc(), VolunteerTask.start_time.asc()).all()

    if search:
        s = search.strip().lower()
        tasks = [
            t
            for t in tasks
            if s in (t.task_title or "").lower()
            or (t.volunteer and t.volunteer.user and s in t.volunteer.user.full_name.lower())
        ]

    return [_to_response(t) for t in tasks]


@router.post("", response_model=VolunteerTaskResponse)
def create_task(
    task_in: VolunteerTaskCreate,
    force: bool = Query(False, description="Set true to create despite a detected time conflict"),
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    # TEMPORARY DEBUG LOGGING — remove once Create Work is confirmed
    # working. If a request reaches this line at all, it means the
    # frontend->backend connection, CORS, and auth are all fine — any
    # remaining failure is validation/business logic below, not a
    # network problem. If you click "Create Work" and NOTHING prints
    # here, the request never reached this endpoint at all.
    print(f"[POST /api/volunteer-tasks] received from user_id={current_user.id} ({current_user.email}): {task_in.model_dump()}")

    volunteer = _get_approved_volunteer_or_error(db, task_in.volunteer_id)
    _validate_time_order(task_in.start_time, task_in.end_time)

    if task_in.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"priority must be one of {VALID_PRIORITIES}")
    if task_in.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    if not force:
        conflicts = _find_conflicts(
            db, task_in.volunteer_id, task_in.duty_date, task_in.start_time, task_in.end_time
        )
        if conflicts:
            raise HTTPException(
                status_code=409,
                detail=_conflict_payload(volunteer.user.full_name, task_in.duty_date, conflicts),
            )

    db_task = VolunteerTask(
        volunteer_id=task_in.volunteer_id,
        task_title=task_in.task_title,
        description=task_in.description,
        service_area=task_in.service_area,
        duty_date=task_in.duty_date,
        start_time=task_in.start_time,
        end_time=task_in.end_time,
        location=task_in.location,
        priority=task_in.priority,
        status=task_in.status,
        assigned_by=current_user.id,
    )
    _append_audit(db_task, "CREATED", current_user, f"Assigned '{task_in.task_title}' to {volunteer.user.full_name}")

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    _notify_volunteer(
        db,
        db_task,
        title="New Seva Assigned",
        message=f"You have been assigned a new Seva: {db_task.task_title} on {db_task.duty_date}.",
        notif_type="WORK_ASSIGNED",
    )

    print(f"[POST /api/volunteer-tasks] SUCCESS — created VolunteerTask.id={db_task.id} for volunteer_id={db_task.volunteer_id}")

    return _to_response(db_task)


# ------------------------------------------------------------------
# Single-item routes — declared AFTER the fixed-path routes above.
# ------------------------------------------------------------------

@router.get("/{task_id}", response_model=VolunteerTaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    task = _get_task_or_404(db, task_id)
    return _to_response(task)


@router.put("/{task_id}", response_model=VolunteerTaskResponse)
def update_task(
    task_id: int,
    update_data: VolunteerTaskUpdate,
    force: bool = Query(False, description="Set true to save despite a detected time conflict"),
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    task = _get_task_or_404(db, task_id)

    new_volunteer_id = update_data.volunteer_id or task.volunteer_id
    new_date = update_data.duty_date or task.duty_date
    new_start = update_data.start_time or task.start_time
    new_end = update_data.end_time if update_data.end_time is not None else task.end_time

    if update_data.volunteer_id is not None:
        _get_approved_volunteer_or_error(db, update_data.volunteer_id)

    if update_data.priority is not None and update_data.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"priority must be one of {VALID_PRIORITIES}")
    if update_data.status is not None and update_data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    _validate_time_order(new_start, new_end)

    touches_schedule = any(
        v is not None
        for v in (update_data.volunteer_id, update_data.duty_date, update_data.start_time, update_data.end_time)
    )
    if not force and touches_schedule:
        conflicts = _find_conflicts(db, new_volunteer_id, new_date, new_start, new_end, exclude_task_id=task.id)
        if conflicts:
            volunteer = db.query(Volunteer).filter(Volunteer.id == new_volunteer_id).first()
            volunteer_name = volunteer.user.full_name if volunteer and volunteer.user else "This volunteer"
            raise HTTPException(
                status_code=409,
                detail=_conflict_payload(volunteer_name, new_date, conflicts),
            )

    previous_volunteer_id = task.volunteer_id
    changed_fields = []
    for field in (
        "volunteer_id",
        "task_title",
        "description",
        "service_area",
        "duty_date",
        "start_time",
        "end_time",
        "location",
        "priority",
        "status",
        "cancellation_reason",
    ):
        value = getattr(update_data, field)
        if value is not None and value != getattr(task, field):
            setattr(task, field, value)
            changed_fields.append(field)

    if changed_fields:
        _append_audit(task, "UPDATED", current_user, f"Changed fields: {', '.join(changed_fields)}")

    db.commit()
    db.refresh(task)

    if changed_fields:
        _notify_volunteer(
            db,
            task,
            title="Seva Assignment Updated",
            message=f"Your assigned Seva '{task.task_title}' has been updated.",
            notif_type="WORK_UPDATED",
        )
        # If the task was reassigned to a different volunteer, let the
        # previous volunteer know it's no longer theirs.
        if "volunteer_id" in changed_fields and previous_volunteer_id != task.volunteer_id:
            prev_volunteer = db.query(Volunteer).filter(Volunteer.id == previous_volunteer_id).first()
            if prev_volunteer and prev_volunteer.user_id:
                create_notification(
                    db,
                    user_id=prev_volunteer.user_id,
                    title="Seva Reassigned",
                    message=f"Your Seva '{task.task_title}' has been reassigned to another volunteer.",
                    notif_type="WORK_UPDATED",
                    related_task_id=task.id,
                )

    return _to_response(task)


@router.patch("/{task_id}/status", response_model=VolunteerTaskResponse)
def update_task_status(
    task_id: int,
    status_update: VolunteerTaskStatusUpdate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    task = _get_task_or_404(db, task_id)
    old_status = task.status
    task.status = status_update.status
    _append_audit(task, "STATUS_CHANGED", current_user, f"{old_status} -> {status_update.status}")

    db.commit()
    db.refresh(task)

    if old_status != task.status:
        _notify_volunteer(
            db,
            task,
            title="Seva Status Updated",
            message=f"Your Seva '{task.task_title}' status changed to {task.status.replace('_', ' ')}.",
            notif_type="STATUS_CHANGED",
        )

    return _to_response(task)


@router.patch("/{task_id}/cancel", response_model=VolunteerTaskResponse)
def cancel_task(
    task_id: int,
    cancel_data: VolunteerTaskCancelUpdate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    task = _get_task_or_404(db, task_id)
    task.status = "CANCELLED"
    task.cancellation_reason = cancel_data.cancellation_reason
    _append_audit(task, "CANCELLED", current_user, cancel_data.cancellation_reason)

    db.commit()
    db.refresh(task)

    _notify_volunteer(
        db,
        task,
        title="Seva Cancelled",
        message=f"Your assigned Seva '{task.task_title}' has been cancelled. Reason: {cancel_data.cancellation_reason}",
        notif_type="WORK_CANCELLED",
    )

    return _to_response(task)


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    task = _get_task_or_404(db, task_id)
    task_title = task.task_title
    volunteer_name = task.volunteer.user.full_name if task.volunteer and task.volunteer.user else "Unknown"

    _append_audit(task, "DELETED", current_user, f"Deleted '{task_title}'")
    db.commit()  # persist the DELETED audit entry before the row is removed

    db.delete(task)
    db.commit()
    return {
        "detail": f"Work/seva assignment '{task_title}' for {volunteer_name} deleted",
    }