import datetime
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Donation, User
from backend.schemas import (
    DonationPublicResponse,
    DonationManageResponse,
    DonationStatsResponse,
)
from backend.auth import get_current_volunteer_or_admin

router = APIRouter(prefix="/api/donations", tags=["donations"])

# Same upload/static-serving convention as backend/routers/sponsors.py and gallery.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"


def _save_upload(file: UploadFile) -> str:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = UPLOADS_DIR / filename
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/static/uploads/{filename}"


def _delete_upload(url: Optional[str]):
    if not url:
        return
    path = BASE_DIR / url.lstrip("/")
    if path.exists():
        try:
            path.unlink()
        except Exception:
            pass


# ==========================================================
# Public — Devotee Contributions & Recognition
# ==========================================================
# IMPORTANT: This is a recognition list only. It NEVER exposes
# contribution_amount, phone_number, or address. Enforced here at the
# response_model level (DonationPublicResponse), not just in the frontend.

@router.get("", response_model=List[DonationPublicResponse])
def get_public_donations(db: Session = Depends(get_db)):
    donations = db.query(Donation).order_by(Donation.created_at.desc()).all()
    return donations


# ==========================================================
# Admin / Volunteer only — full private details + management
# ==========================================================

@router.get("/manage/all", response_model=List[DonationManageResponse])
def get_all_donations_for_management(
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    return db.query(Donation).order_by(Donation.created_at.desc()).all()


@router.get("/manage/stats", response_model=DonationStatsResponse)
def get_donation_stats(
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    total_contributors = db.query(Donation).count()
    total_contribution_amount = db.query(
        func.coalesce(func.sum(Donation.contribution_amount), 0.0)
    ).scalar()

    purpose_rows = (
        db.query(
            Donation.contribution_purpose,
            func.coalesce(func.sum(Donation.contribution_amount), 0.0),
        )
        .group_by(Donation.contribution_purpose)
        .all()
    )
    contributions_by_purpose = {purpose or "Other": float(total) for purpose, total in purpose_rows}

    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    recent_contributions_count = (
        db.query(Donation).filter(Donation.created_at >= seven_days_ago).count()
    )

    return {
        "total_contributors": total_contributors,
        "total_contribution_amount": float(total_contribution_amount or 0.0),
        "contributions_by_purpose": contributions_by_purpose,
        "recent_contributions_count": recent_contributions_count,
    }


@router.post("", response_model=DonationManageResponse)
def create_donation(
    donor_name: str = Form(...),
    family_name: Optional[str] = Form(None),
    contribution_amount: float = Form(...),
    contribution_purpose: str = Form("General Festival Contribution"),
    phone_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    optional_message: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    photo_url = _save_upload(photo) if (photo and photo.filename) else None

    donation = Donation(
        donor_name=donor_name,
        family_name=family_name,
        contribution_amount=contribution_amount,
        contribution_purpose=contribution_purpose,
        phone_number=phone_number,
        address=address,
        photo_url=photo_url,
        optional_message=optional_message,
        created_by=manager.id,
    )
    db.add(donation)
    db.commit()
    db.refresh(donation)
    return donation


@router.put("/{donation_id}", response_model=DonationManageResponse)
def update_donation(
    donation_id: int,
    donor_name: str = Form(...),
    family_name: Optional[str] = Form(None),
    contribution_amount: float = Form(...),
    contribution_purpose: str = Form("General Festival Contribution"),
    phone_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    optional_message: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Contribution not found")

    donation.donor_name = donor_name
    donation.family_name = family_name
    donation.contribution_amount = contribution_amount
    donation.contribution_purpose = contribution_purpose
    donation.phone_number = phone_number
    donation.address = address
    donation.optional_message = optional_message

    if photo and photo.filename:
        old_photo_url = donation.photo_url
        donation.photo_url = _save_upload(photo)
        _delete_upload(old_photo_url)
    # else: keep existing photo_url untouched

    db.commit()
    db.refresh(donation)
    return donation


@router.delete("/{donation_id}")
def delete_donation(
    donation_id: int,
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    donation = db.query(Donation).filter(Donation.id == donation_id).first()
    if not donation:
        raise HTTPException(status_code=404, detail="Contribution not found")

    _delete_upload(donation.photo_url)
    db.delete(donation)
    db.commit()
    return {"detail": "Contribution deleted successfully"}