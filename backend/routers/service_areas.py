"""
Service Area Management — a small, dynamic, DB-backed list of seva/work
service areas (e.g. "Prasadam Distribution", "Crowd Control & Security").

This replaces the old hardcoded <select> options in the frontend. Both
the Volunteer application form's "Preferred Area of Service" dropdown
and the Work/Seva assignment form's "Service Area" dropdown now load
this list live from GET /api/service-areas.

Permissions:
  - GET  -> any authenticated user (a DEVOTEE filling out the volunteer
            application form needs to see the list too).
  - POST/PUT/DELETE -> ADMIN or APPROVED VOLUNTEER only, via the same
            get_current_volunteer_or_admin dependency used everywhere
            else in the Work/Seva feature.

VolunteerTask.service_area stores the area's NAME as plain text, not a
foreign key — so deleting a ServiceArea here never breaks or cascades
into existing task records; they simply keep whatever label they had.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user, get_current_volunteer_or_admin
from backend.database import get_db
from backend.models import ServiceArea, User
from backend.schemas import ServiceAreaCreate, ServiceAreaResponse, ServiceAreaUpdate

router = APIRouter(prefix="/api/service-areas", tags=["service-areas"])

DEFAULT_SERVICE_AREAS = [
    ("Prasadam Distribution", "Manage prasadam counter and distribution queue"),
    ("Crowd Control & Security", "Manage crowd flow and basic security support"),
    ("Mandapam Decoration & Lights", "Decoration and lighting setup for the mandapam"),
    ("First Aid & Health Helpdesk", "Basic first aid and health assistance desk"),
    ("Cultural Stage Coordinator", "Coordinate cultural program stage activities"),
]


@router.get("", response_model=List[ServiceAreaResponse])
def list_service_areas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    areas = db.query(ServiceArea).order_by(ServiceArea.name.asc()).all()
    if not areas:
        # Seed with sensible defaults on first use, same pattern as
        # EmergencyContact/LiveCamera seeding in routers/admin.py — so the
        # dropdown is never empty on a fresh install, but every entry is
        # still a real, editable/deletable database row afterward.
        for name, description in DEFAULT_SERVICE_AREAS:
            db.add(ServiceArea(name=name, description=description))
        db.commit()
        areas = db.query(ServiceArea).order_by(ServiceArea.name.asc()).all()
    return areas


@router.post("", response_model=ServiceAreaResponse)
def create_service_area(
    data: ServiceAreaCreate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Service area name is required")

    existing = db.query(ServiceArea).filter(ServiceArea.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A service area with this name already exists")

    area = ServiceArea(name=name, description=data.description)
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


@router.put("/{area_id}", response_model=ServiceAreaResponse)
def update_service_area(
    area_id: int,
    data: ServiceAreaUpdate,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    area = db.query(ServiceArea).filter(ServiceArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Service area not found")

    if data.name is not None:
        new_name = data.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="Service area name cannot be empty")
        dup = db.query(ServiceArea).filter(ServiceArea.name == new_name, ServiceArea.id != area_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="A service area with this name already exists")
        area.name = new_name

    if data.description is not None:
        area.description = data.description

    db.commit()
    db.refresh(area)
    return area


@router.delete("/{area_id}")
def delete_service_area(
    area_id: int,
    current_user: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    area = db.query(ServiceArea).filter(ServiceArea.id == area_id).first()
    if not area:
        raise HTTPException(status_code=404, detail="Service area not found")

    # Safe delete: service_area on VolunteerTask/Volunteer is a plain text
    # column, not a foreign key, so existing assignments/applications keep
    # their text label unaffected.
    name = area.name
    db.delete(area)
    db.commit()
    return {"detail": f"Service area '{name}' deleted"}