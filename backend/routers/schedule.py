from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import FestivalSchedule, User
from backend.schemas import ScheduleItemCreate, ScheduleItemUpdate, ScheduleItemResponse
from backend.auth import get_current_volunteer_or_admin

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


# ==========================================
# PUBLIC — anyone, no login required
# Every schedule item is public (unlike announcements there is no
# publish/hide flag), so the same GET list also backs the management
# screen. Ordered by date then start_time so each Day tab renders
# chronologically; the frontend groups by `day` client-side.
# ==========================================

@router.get("", response_model=List[ScheduleItemResponse])
def get_schedule(db: Session = Depends(get_db)):
    return (
        db.query(FestivalSchedule)
        .order_by(FestivalSchedule.date.asc(), FestivalSchedule.start_time.asc())
        .all()
    )


@router.get("/{item_id}", response_model=ScheduleItemResponse)
def get_schedule_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FestivalSchedule).filter(FestivalSchedule.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")
    return item


# ==========================================
# MANAGEMENT — ADMIN and VOLUNTEER, equal permissions
# get_current_volunteer_or_admin (backend/auth.py) already treats both
# roles identically, so every management endpoint below is naturally
# equal-permission with no extra role branching — same pattern as
# backend/routers/announcements.py.
# ==========================================

@router.post("", response_model=ScheduleItemResponse)
def create_schedule_item(
    data: ScheduleItemCreate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    db_item = FestivalSchedule(
        day=data.day,
        title=data.title,
        description=data.description,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        is_important=data.is_important,
        created_by=current_user.id,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/{item_id}", response_model=ScheduleItemResponse)
def update_schedule_item(
    item_id: int,
    data: ScheduleItemUpdate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    item = db.query(FestivalSchedule).filter(FestivalSchedule.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")

    if data.day is not None:
        item.day = data.day
    if data.title is not None:
        item.title = data.title
    if data.description is not None:
        item.description = data.description
    if data.date is not None:
        item.date = data.date
    if data.start_time is not None:
        item.start_time = data.start_time
    if data.end_time is not None:
        item.end_time = data.end_time
    if data.location is not None:
        item.location = data.location
    if data.is_important is not None:
        item.is_important = data.is_important

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_schedule_item(
    item_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    item = db.query(FestivalSchedule).filter(FestivalSchedule.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Schedule item deleted"}


@router.put("/{item_id}/important", response_model=ScheduleItemResponse)
def toggle_important(
    item_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    """Convenience endpoint: flips is_important — mirrors the
    /announcements/{id}/pin toggle so the dashboard can wire a single
    star-icon button without building a full edit payload."""
    item = db.query(FestivalSchedule).filter(FestivalSchedule.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Schedule item not found")

    item.is_important = not item.is_important
    db.commit()
    db.refresh(item)
    return item