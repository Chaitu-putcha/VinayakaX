"""
Notifications — per-user messages, primarily driven by the Volunteer
Work/Seva system (new assignment, edit, cancellation, status change),
but modeled generically so other features can reuse it later.

Endpoints here only ever expose the CALLER's own notifications — there
is deliberately no "list any user's notifications" or public POST
endpoint. Notifications are created internally, from real events, via
the create_notification() helper below (imported and called directly
from routers/volunteer_tasks.py).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Notification, User
from backend.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    return q.order_by(Notification.created_at.desc()).all()


@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {"unread_count": count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"detail": "All notifications marked as read"}


# ------------------------------------------------------------------
# Internal helper — imported and called by other routers (currently
# routers/volunteer_tasks.py) when a real event happens. Not exposed
# as its own POST endpoint.
# ------------------------------------------------------------------

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notif_type: str = "INFO",
    related_task_id: Optional[int] = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notif_type=notif_type,
        related_task_id=related_task_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif