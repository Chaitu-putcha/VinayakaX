from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import Announcement, User
from backend.schemas import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from backend.auth import get_current_volunteer_or_admin

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


# ==========================================
# PUBLIC — anyone, no login required
# Only ever returns published announcements.
# Pinned announcements always come first.
# ==========================================

@router.get("", response_model=List[AnnouncementResponse])
def get_published_announcements(db: Session = Depends(get_db)):
    return (
        db.query(Announcement)
        .filter(Announcement.is_published == True)  # noqa: E712
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .all()
    )


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_published_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = (
        db.query(Announcement)
        .filter(Announcement.id == announcement_id, Announcement.is_published == True)  # noqa: E712
        .first()
    )
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return announcement


# ==========================================
# MANAGEMENT — ADMIN and VOLUNTEER, equal permissions
# get_current_volunteer_or_admin (backend/auth.py) already treats both
# roles identically, so every management endpoint below is naturally
# equal-permission with no extra role branching.
# ==========================================

@router.get("/manage/all", response_model=List[AnnouncementResponse])
def get_all_announcements(
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    """Admin/Volunteer view — includes hidden/unpublished announcements."""
    return (
        db.query(Announcement)
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .all()
    )


@router.post("", response_model=AnnouncementResponse)
def create_announcement(
    data: AnnouncementCreate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    db_announcement = Announcement(
        title=data.title,
        description=data.description,
        event_datetime=data.event_datetime,
        is_pinned=data.is_pinned,
        is_published=data.is_published,
        created_by=current_user.id,
    )
    db.add(db_announcement)
    db.commit()
    db.refresh(db_announcement)
    return db_announcement


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    data: AnnouncementUpdate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if data.title is not None:
        announcement.title = data.title
    if data.description is not None:
        announcement.description = data.description
    if data.event_datetime is not None:
        announcement.event_datetime = data.event_datetime
    if data.is_pinned is not None:
        announcement.is_pinned = data.is_pinned
    if data.is_published is not None:
        announcement.is_published = data.is_published

    db.commit()
    db.refresh(announcement)
    return announcement


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    db.delete(announcement)
    db.commit()
    return {"detail": "Announcement deleted"}


@router.put("/{announcement_id}/pin", response_model=AnnouncementResponse)
def toggle_pin(
    announcement_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    """Convenience endpoint: flips is_pinned. Kept in addition to PUT /{id}
    so the dashboard can wire a single pin-icon button without building a
    full edit payload."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    announcement.is_pinned = not announcement.is_pinned
    db.commit()
    db.refresh(announcement)
    return announcement


@router.put("/{announcement_id}/publish", response_model=AnnouncementResponse)
def toggle_publish(
    announcement_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    """Convenience endpoint: flips is_published (publish/hide)."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    announcement.is_published = not announcement.is_published
    db.commit()
    db.refresh(announcement)
    return announcement