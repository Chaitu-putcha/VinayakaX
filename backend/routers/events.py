from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import Event, User
from backend.schemas import EventCreate, EventResponse
from backend.auth import get_current_admin


router = APIRouter(
    prefix="/api/events",
    tags=["events"]
)


# ==========================================
# CREATE EVENT
# Only Admin
# ==========================================

@router.post("", response_model=EventResponse)
def create_event(
    event_in: EventCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    db_event = Event(
        title=event_in.title,
        description=event_in.description,
        date=event_in.date,
        time=event_in.time,
        location=event_in.location,
        category=event_in.category,
        image_url=event_in.image_url,
        created_by=admin.full_name
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event


# ==========================================
# GET ALL EVENTS
# Everyone can view
# ==========================================

@router.get("", response_model=List[EventResponse])
def get_events(
    db: Session = Depends(get_db)
):
    return db.query(Event).order_by(Event.id.asc()).all()


# ==========================================
# UPDATE EVENT
# Only Admin
# ==========================================

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_in: EventCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    event.title = event_in.title
    event.description = event_in.description
    event.date = event_in.date
    event.time = event_in.time
    event.location = event_in.location
    event.category = event_in.category
    event.image_url = event_in.image_url

    db.commit()
    db.refresh(event)

    return event


# ==========================================
# DELETE EVENT
# Only Admin
# ==========================================

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(
        Event.id == event_id
    ).first()

    if not event:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    db.delete(event)
    db.commit()

    return {
        "detail": "Event deleted"
    }