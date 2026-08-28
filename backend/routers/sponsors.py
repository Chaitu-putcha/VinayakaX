import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Sponsor, User
from backend.schemas import SponsorResponse, SponsorStatsResponse
from backend.auth import get_current_volunteer_or_admin

router = APIRouter(prefix="/api/sponsors", tags=["sponsors"])

# Same upload/static-serving convention as backend/routers/gallery.py
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"

CATEGORY_ORDER = {
    "Platinum Sponsor": 0,
    "Gold Sponsor": 1,
    "Silver Sponsor": 2,
    "Supporter": 3,
}


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
# Public
# ==========================================================

@router.get("", response_model=List[SponsorResponse])
def get_sponsors(db: Session = Depends(get_db)):
    sponsors = db.query(Sponsor).order_by(Sponsor.created_at.desc()).all()
    sponsors.sort(key=lambda s: CATEGORY_ORDER.get(s.sponsor_category, 99))
    return sponsors


@router.get("/{sponsor_id}", response_model=SponsorResponse)
def get_sponsor(sponsor_id: int, db: Session = Depends(get_db)):
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    return sponsor


# ==========================================================
# Admin / Volunteer only
# ==========================================================

@router.get("/manage/stats", response_model=SponsorStatsResponse)
def get_sponsor_stats(
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    total_sponsors = db.query(Sponsor).count()
    total_contribution = db.query(func.coalesce(func.sum(Sponsor.contribution_amount), 0.0)).scalar()
    return {
        "total_sponsors": total_sponsors,
        "total_contribution": float(total_contribution or 0.0),
    }


@router.post("", response_model=SponsorResponse)
def create_sponsor(
    sponsor_name: str = Form(...),
    contact_person_name: Optional[str] = Form(None),
    sponsor_category: str = Form("Supporter"),
    contribution_amount: float = Form(...),
    contribution_details: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    optional_message: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    photo_url = _save_upload(photo) if (photo and photo.filename) else None

    sponsor = Sponsor(
        sponsor_name=sponsor_name,
        contact_person_name=contact_person_name,
        sponsor_category=sponsor_category,
        contribution_amount=contribution_amount,
        contribution_details=contribution_details,
        phone_number=phone_number,
        address=address,
        photo_url=photo_url,
        optional_message=optional_message,
        created_by=manager.id,
    )
    db.add(sponsor)
    db.commit()
    db.refresh(sponsor)
    return sponsor


@router.put("/{sponsor_id}", response_model=SponsorResponse)
def update_sponsor(
    sponsor_id: int,
    sponsor_name: str = Form(...),
    contact_person_name: Optional[str] = Form(None),
    sponsor_category: str = Form("Supporter"),
    contribution_amount: float = Form(...),
    contribution_details: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    optional_message: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    sponsor.sponsor_name = sponsor_name
    sponsor.contact_person_name = contact_person_name
    sponsor.sponsor_category = sponsor_category
    sponsor.contribution_amount = contribution_amount
    sponsor.contribution_details = contribution_details
    sponsor.phone_number = phone_number
    sponsor.address = address
    sponsor.optional_message = optional_message

    if photo and photo.filename:
        old_photo_url = sponsor.photo_url
        sponsor.photo_url = _save_upload(photo)
        _delete_upload(old_photo_url)
    # else: keep existing photo_url untouched

    db.commit()
    db.refresh(sponsor)
    return sponsor


@router.delete("/{sponsor_id}")
def delete_sponsor(
    sponsor_id: int,
    manager: User = Depends(get_current_volunteer_or_admin),
    db: Session = Depends(get_db),
):
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    _delete_upload(sponsor.photo_url)
    db.delete(sponsor)
    db.commit()
    return {"detail": "Sponsor deleted successfully"}