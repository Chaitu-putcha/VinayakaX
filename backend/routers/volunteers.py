from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
import uuid
import datetime

from backend.database import get_db
from backend.models import Volunteer, User
from backend.schemas import (
    VolunteerResponse,
    VolunteerCreate,
    VolunteerUpdate,
    MyVolunteerStatusResponse,
)
from backend.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])


@router.post("/apply", response_model=VolunteerResponse)
def apply_to_be_volunteer(volunteer_in: VolunteerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if they have already applied
    existing = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to be a volunteer"
        )

    db_volunteer = Volunteer(
        user_id=current_user.id,
        status="PENDING",
        assigned_work=volunteer_in.assigned_work,
        performance_score=5.0,
        attendance_json="[]",
        shifts_json="[]",
        qr_code_token=str(uuid.uuid4())[:8]  # unique 8-character token for QR ID card
    )
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer


# ------------------------------------------------------------------
# NEW: "do I have an application, and what does it look like" — scoped
# to the CALLER only, via a direct Volunteer.user_id == current_user.id
# lookup. Any authenticated user can call this (DEVOTEE included — it
# just returns has_applied=False, application=None for them).
#
# This replaces the old frontend pattern of probing the ADMIN-only
# GET /all endpoint and silently swallowing the resulting 403/404
# before falling back to the approved-only list — that pattern is what
# was producing the confusing "GET /api/volunteers/all -> 404" noise.
# MyVolunteerStatusResponse has existed in schemas.py since it was
# first written; this was the missing endpoint that was supposed to
# use it.
# ------------------------------------------------------------------
@router.get("/my-application", response_model=MyVolunteerStatusResponse)
def get_my_volunteer_application(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    volunteer = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    return MyVolunteerStatusResponse(
        has_applied=volunteer is not None,
        application=volunteer,
    )


@router.get("", response_model=List[VolunteerResponse])
def get_volunteers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Volunteers list can be seen by registered users, or admin.
    # This is the endpoint the "Select Volunteer" dropdown on the
    # Work/Seva page actually calls.
    results = db.query(Volunteer).filter(Volunteer.status == "APPROVED").all()

    # TEMPORARY DEBUG LOGGING — remove once the dropdown is confirmed
    # working. Prints exactly what this endpoint is about to return,
    # in your backend terminal, on every call.
    print(f"[GET /api/volunteers] returning {len(results)} APPROVED volunteer(s):")
    for v in results:
        name = v.user.full_name if v.user else "(no linked User!)"
        print(f"    - Volunteer.id={v.id}  user_id={v.user_id}  status={v.status!r}  name={name!r}")

    return results


@router.get("/all", response_model=List[VolunteerResponse])
def get_all_applications(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Admin can see all applications (PENDING, APPROVED, REJECTED)
    return db.query(Volunteer).all()


@router.put("/{volunteer_id}", response_model=VolunteerResponse)
def update_volunteer(volunteer_id: int, update_data: VolunteerUpdate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    if update_data.status is not None:
        volunteer.status = update_data.status
        # If approved, update corresponding User role to VOLUNTEER
        if update_data.status == "APPROVED":
            volunteer.user.role = "VOLUNTEER"
        elif update_data.status == "REJECTED":
            volunteer.user.role = "DEVOTEE"

    if update_data.assigned_work is not None:
        volunteer.assigned_work = update_data.assigned_work

    if update_data.performance_score is not None:
        volunteer.performance_score = update_data.performance_score

    if update_data.shifts_json is not None:
        # validate json format
        try:
            json.loads(update_data.shifts_json)
            volunteer.shifts_json = update_data.shifts_json
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid shifts JSON string")

    if update_data.attendance_json is not None:
        # validate json format
        try:
            json.loads(update_data.attendance_json)
            volunteer.attendance_json = update_data.attendance_json
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid attendance JSON string")

    db.commit()
    db.refresh(volunteer)
    return volunteer


@router.delete("/{volunteer_id}")
def delete_volunteer(volunteer_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    # Revert user role
    volunteer.user.role = "DEVOTEE"
    db.delete(volunteer)
    db.commit()
    return {"detail": "Volunteer profile deleted"}


@router.post("/scan-checkin/{qr_code}")
def scan_volunteer_qr_checkin(qr_code: str, db: Session = Depends(get_db)):
    # Scan volunteer's physical card to check in / register attendance for today
    volunteer = db.query(Volunteer).filter(Volunteer.qr_code_token == qr_code).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Invalid QR Code ID Card")

    if volunteer.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Volunteer is not approved yet")

    today_str = datetime.date.today().isoformat()
    try:
        attendance = json.loads(volunteer.attendance_json)
    except Exception:
        attendance = []

    if today_str in attendance:
        return {"status": "ALREADY_CHECKED_IN", "volunteer": volunteer.user.full_name, "date": today_str}

    attendance.append(today_str)
    volunteer.attendance_json = json.dumps(attendance)
    db.commit()
    return {"status": "SUCCESS", "volunteer": volunteer.user.full_name, "date": today_str}