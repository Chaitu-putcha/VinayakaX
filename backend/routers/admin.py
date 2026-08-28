from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from backend.database import get_db
from backend.models import (
    Expense,
    EmergencyContact,
    Announcement,
    LiveCamera,
    User,
    Donation,
    Volunteer,
    Competition,
    GalleryItem,
    Event
)
from backend.schemas import ExpenseCreate, ExpenseResponse, EmergencyContactBase, EmergencyContactResponse, AnnouncementCreate, AnnouncementResponse, LiveCameraCreate, LiveCameraResponse
from backend.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Analytics Endpoint
@router.get("/analytics")
def get_dashboard_analytics(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_donations = db.query(Donation).filter(Donation.status == "SUCCESS").all()
    total_donation_amount = sum(d.amount for d in total_donations)
    
    total_volunteers = db.query(Volunteer).filter(Volunteer.status == "APPROVED").count()
    pending_volunteers = db.query(Volunteer).filter(Volunteer.status == "PENDING").count()
    
    total_competitions = db.query(Competition).count()
    total_gallery = db.query(GalleryItem).count()
    approved_gallery = db.query(GalleryItem).filter(GalleryItem.is_approved == True).count()
    
    # Mocking device analytics
    devices = {"Desktop": 58, "Mobile": 38, "Tablet": 4}
    
    # Mocking location analytics (top locations around Andhra Pradesh & devotees abroad)
    locations = {
        "Srikakulam": 642,
        "Vajrapukotturu": 320,
        "Palasa": 150,
        "Visakhapatnam": 120,
        "Hyderabad": 95,
        "Bengaluru": 45,
        "Other (NRIs)": 28
    }
    
    # Mock visitor counts (representing a standard 9-day Navarathri growth)
    visitor_trend = [
        {"day": "Day 1", "visitors": 1200},
        {"day": "Day 2", "visitors": 1500},
        {"day": "Day 3", "visitors": 1800},
        {"day": "Day 4", "visitors": 2100},
        {"day": "Day 5", "visitors": 2800},
        {"day": "Day 6", "visitors": 3200},
        {"day": "Day 7", "visitors": 4000},
        {"day": "Day 8", "visitors": 5500},
        {"day": "Day 9 (Nimajjanam)", "visitors": 9200}
    ]
    
    return {
        "total_donation_amount": total_donation_amount,
        "total_donations_count": len(total_donations),
        "total_volunteers": total_volunteers,
        "pending_volunteers": pending_volunteers,
        "total_competitions": total_competitions,
        "gallery": {
            "total": total_gallery,
            "approved": approved_gallery,
            "pending": total_gallery - approved_gallery
        },
        "devices": devices,
        "locations": locations,
        "visitor_trend": visitor_trend
    }
@router.get("/dashboard")
def dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return {
        "total_users": db.query(User).count(),
        "total_events": db.query(Event).count(),
        "total_donations": db.query(Donation).count(),
        "total_volunteers": db.query(Volunteer).count(),
        "pending_gallery": db.query(GalleryItem).filter(
            GalleryItem.is_approved == False
        ).count()
    }
# Expense endpoints
@router.post("/expenses", response_model=ExpenseResponse)
def create_expense(expense_in: ExpenseCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_expense = Expense(
        title=expense_in.title,
        category=expense_in.category,
        amount=expense_in.amount,
        date=expense_in.date
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/expenses", response_model=List[ExpenseResponse])
def get_expenses(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(Expense).order_by(Expense.date.desc()).all()

@router.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(exp)
    db.commit()
    return {"detail": "Expense record deleted"}

# Emergency Contacts endpoints (Public Read, Admin Write)
@router.post("/contacts", response_model=EmergencyContactResponse)
def create_contact(contact_in: EmergencyContactBase, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_contact = EmergencyContact(
        name=contact_in.name,
        role=contact_in.role,
        phone=contact_in.phone
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/contacts", response_model=List[EmergencyContactResponse])
def get_contacts(db: Session = Depends(get_db)):
    contacts = db.query(EmergencyContact).all()
    # If table is empty, seed defaults
    if not contacts:
        defaults = [
            EmergencyContact(name="Sri Vinayaka Committee Desk", role="Main Coordinator", phone="+91 7993093251"),
            EmergencyContact(name="Vajrapukotturu Police Station", role="Local Police", phone="100"),
            EmergencyContact(name="Palasa Government Hospital", role="Ambulance/Medical", phone="108"),
            EmergencyContact(name="Venky Chotu", role="Committee Lead", phone="+91 7993093251"),
            EmergencyContact(name="Yogesh", role="President", phone="+91 7993093251")
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        contacts = db.query(EmergencyContact).all()
    return contacts

# Live Camera endpoints
@router.post("/cameras", response_model=LiveCameraResponse)
def create_camera(cam_in: LiveCameraCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_cam = LiveCamera(
        name=cam_in.name,
        stream_url=cam_in.stream_url,
        is_active=cam_in.is_active
    )
    db.add(db_cam)
    db.commit()
    db.refresh(db_cam)
    return db_cam

@router.get("/cameras", response_model=List[LiveCameraResponse])
def get_cameras(db: Session = Depends(get_db)):
    cams = db.query(LiveCamera).all()
    # Seed default streams if empty
    if not cams:
        defaults = [
            LiveCamera(name="Main Mandapam - Cam 1", stream_url="https://www.youtube.com/embed/dQw4w9WgXcQ", is_active=True),
            LiveCamera(name="Harathi Stage - Cam 2", stream_url="https://www.youtube.com/embed/dQw4w9WgXcQ", is_active=True)
        ]
        for d in defaults:
            db.add(d)
        db.commit()
        cams = db.query(LiveCamera).all()
    return cams

# Announcements (Public Read, Admin Write)
@router.post("/announcements", response_model=AnnouncementResponse)
def create_announcement(ann_in: AnnouncementCreate, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    db_ann = Announcement(
        title=ann_in.title,
        content=ann_in.content,
        is_active=True
    )
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    return db_ann

@router.get("/announcements", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db)):
    anns = db.query(Announcement).filter(Announcement.is_active == True).all()
    if not anns:
        # seed default announcement
        default_ann = Announcement(
            title="Sri Vinayaka Navarathri Utsavalu Starts Soon!",
            content="Devotees are invited to join the grand opening Pooja on Day 1 at Putchavani Totalu Street, Uddanam Ramakrishna Puram.",
            is_active=True
        )
        db.add(default_ann)
        db.commit()
        anns = db.query(Announcement).filter(Announcement.is_active == True).all()
    return anns
@router.get("/users")
def get_all_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id.desc()).all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
        }
        for user in users
    ]