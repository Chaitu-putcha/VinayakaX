from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict
from datetime import datetime

# Auth / User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    username: Optional[str] = None
    role: str
    profile_image_url: Optional[str] = None  # ADDED: profile photo support
    created_at: datetime

    class Config:
        from_attributes = True
class UserUpdate(BaseModel):
    full_name: str
    email: EmailStr
    profile_image_url: Optional[str] = None  # ADDED: profile photo support
class UserLogin(BaseModel):
    login: str
    password: str
class MemberAccountCreate(BaseModel):
    username: str
    full_name: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    email: str
    id: int
    profile_image_url: Optional[str] = None  # ADDED: profile photo support

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
class ChangePassword(BaseModel):
    old_password: str
    new_password: str
# Volunteer Schemas
class VolunteerBase(BaseModel):
    assigned_work: Optional[str] = None

class VolunteerCreate(VolunteerBase):
    pass

class VolunteerUpdate(BaseModel):
    status: Optional[str] = None
    assigned_work: Optional[str] = None
    performance_score: Optional[float] = None
    attendance_json: Optional[str] = None
    shifts_json: Optional[str] = None
    

class VolunteerResponse(BaseModel):
    id: int
    user_id: int
    status: str
    assigned_work: Optional[str]
    performance_score: float
    attendance_json: str
    shifts_json: str
    qr_code_token: Optional[str]
    user: UserResponse
    class Config:
        from_attributes = True


# NEW: "do I have an application, and what does it look like" — used by
# DEVOTEE/USER on the Volunteers page, scoped to the caller only.
class MyVolunteerStatusResponse(BaseModel):
    has_applied: bool
    application: Optional[VolunteerResponse] = None


# NEW: admin-only summary cards
class VolunteerStatsResponse(BaseModel):
    total_volunteers: int
    pending_applications: int
    approved_volunteers: int
    rejected_applications: int
    on_duty_now: int
    todays_duty_shifts: int


# NEW: Duty Assignment Schemas
class DutyAssignmentCreate(BaseModel):
    volunteer_id: int
    service_area: str
    duty_date: str
    location: str
    shift: str

class DutyAssignmentUpdate(BaseModel):
    service_area: Optional[str] = None
    duty_date: Optional[str] = None
    location: Optional[str] = None
    shift: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in ("NOT_STARTED", "CHECKED_IN", "CHECKED_OUT"):
            raise ValueError("status must be NOT_STARTED, CHECKED_IN, or CHECKED_OUT")
        return v

class DutyAssignmentResponse(BaseModel):
    id: int
    volunteer_id: int
    service_area: str
    duty_date: str
    location: str
    shift: str
    status: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    assigned_by: int
    created_at: datetime
    volunteer: VolunteerResponse
    class Config:
        from_attributes = True


# ==========================================
# VOLUNTEER TASK SCHEMAS (Seva / Work Assignment Management)
# ==========================================
# Separate from DutyAssignment: this is the free-text "who is doing which
# custom work, on which date, at what time" system. Admin and APPROVED
# Volunteers share identical write permissions here; DEVOTEE/normal users
# get read-only access via the GET endpoints only (enforced in the router).

VOLUNTEER_TASK_PRIORITIES = ("LOW", "NORMAL", "HIGH", "URGENT")
VOLUNTEER_TASK_STATUSES = ("ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED")


class VolunteerTaskCreate(BaseModel):
    volunteer_id: int
    task_title: str
    description: Optional[str] = None
    service_area: Optional[str] = None
    duty_date: str
    start_time: str
    end_time: Optional[str] = None
    location: Optional[str] = None
    priority: str = "NORMAL"
    status: str = "ASSIGNED"

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        if v not in VOLUNTEER_TASK_PRIORITIES:
            raise ValueError(f"priority must be one of {VOLUNTEER_TASK_PRIORITIES}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in VOLUNTEER_TASK_STATUSES:
            raise ValueError(f"status must be one of {VOLUNTEER_TASK_STATUSES}")
        return v


class VolunteerTaskUpdate(BaseModel):
    volunteer_id: Optional[int] = None
    task_title: Optional[str] = None
    description: Optional[str] = None
    service_area: Optional[str] = None
    duty_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    cancellation_reason: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        if v is not None and v not in VOLUNTEER_TASK_PRIORITIES:
            raise ValueError(f"priority must be one of {VOLUNTEER_TASK_PRIORITIES}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is not None and v not in VOLUNTEER_TASK_STATUSES:
            raise ValueError(f"status must be one of {VOLUNTEER_TASK_STATUSES}")
        return v


class VolunteerTaskResponse(BaseModel):
    id: int
    volunteer_id: int
    volunteer_name: str
    task_title: str
    description: Optional[str] = None
    service_area: Optional[str] = None
    duty_date: str
    start_time: str
    end_time: Optional[str] = None
    location: Optional[str] = None
    priority: str
    status: str
    cancellation_reason: Optional[str] = None
    assigned_by: int
    assigned_by_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VolunteerTaskStatsResponse(BaseModel):
    total_volunteers: int
    total_active_works: int
    todays_works: int
    completed_works: int
    pending_works: int


# ==========================================
# SERVICE AREA SCHEMAS (dynamic, DB-backed — replaces the old hardcoded
# frontend dropdown for both the volunteer application form and the
# Work/Seva assignment form)
# ==========================================

class ServiceAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ServiceAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ServiceAreaResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# NOTIFICATION SCHEMAS
# ==========================================

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notif_type: str
    related_task_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# DONATION SCHEMAS (Devotee Contributions & Recognition)
# ==========================================
# No payment-gateway fields here (no transaction_id, payment_method,
# status, receipt_number, is_anonymous). This app does not process
# payments — it records offline devotee/family contributions for
# public recognition only.
#
# Privacy split:
#   - DonationPublicResponse: safe for public/DEVOTEE users. Never
#     includes contribution_amount, phone_number, or address.
#   - DonationManageResponse: ADMIN/VOLUNTEER only. Includes the
#     private fields above.

DONATION_PURPOSE_CHOICES = [
    "Vinayaka Pooja",
    "Annadanam",
    "Prasadam",
    "Flower Decoration",
    "Mandapam Decoration",
    "Lights & Sound",
    "Cultural Program",
    "General Festival Contribution",
    "Other",
]


class DonationBase(BaseModel):
    donor_name: str
    family_name: Optional[str] = None
    contribution_purpose: str = "General Festival Contribution"
    optional_message: Optional[str] = None


class DonationPublicResponse(DonationBase):
    """What DEVOTEE/public users receive from GET /api/donations."""
    id: int
    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DonationManageResponse(DonationBase):
    """What ADMIN/VOLUNTEER receive from the /manage/* endpoints."""
    id: int
    contribution_amount: float
    phone_number: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DonationStatsResponse(BaseModel):
    total_contributors: int
    total_contribution_amount: float
    contributions_by_purpose: Dict[str, float]
    recent_contributions_count: int  # contributions logged in the last 7 days


# Gallery Schemas
class CommentCreate(BaseModel):
    text: str

class GalleryItemCreate(BaseModel):
    url: str
    type: str = "PHOTO"  # PHOTO or VIDEO
    caption: Optional[str] = None
    album: Optional[str] = "General"
    ai_tags: Optional[str] = ""

class GalleryItemResponse(BaseModel):
    id: int
    uploader_name: str
    user_id: int
    type: str
    url: str
    caption: Optional[str]
    likes_count: int
    favorite_users_json: str
    liked_users_json: str
    comments_json: str
    is_approved: bool
    album: str
    ai_tags: str
    created_at: datetime
    class Config:
        from_attributes = True

# Event Schemas
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None

    date: str
    time: str

    location: str = "PUTCHAVANI TOTALU STREET"
    category: str = "Pooja"

    image_url: Optional[str] = None


class EventResponse(EventCreate):
    id: int

    created_by: Optional[str]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# COMPETITION MANAGEMENT SCHEMAS
# ==========================================

class CompetitionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CompetitionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_by: int
    created_at: datetime
    participant_count: int = 0

    class Config:
        from_attributes = True


# ==========================================
# PARTICIPANT MANAGEMENT SCHEMAS
# ==========================================

class ParticipantCreate(BaseModel):
    full_name: str
    age: int
    phone: str
    competition_id: int


class ParticipantResponse(BaseModel):
    id: int
    full_name: str
    age: int
    phone: str
    photo_url: Optional[str] = None
    competition_id: int
    registered_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# WINNER MANAGEMENT SCHEMAS
# ==========================================

class WinnerCreate(BaseModel):
    competition_id: int
    participant_id: int
    prize_position: int

    @field_validator("prize_position")
    @classmethod
    def validate_prize_position(cls, v):
        if v not in (1, 2, 3):
            raise ValueError("prize_position must be 1, 2, or 3")
        return v


class WinnerUpdate(BaseModel):
    competition_id: Optional[int] = None
    participant_id: Optional[int] = None
    prize_position: Optional[int] = None

    @field_validator("prize_position")
    @classmethod
    def validate_prize_position(cls, v):
        if v is not None and v not in (1, 2, 3):
            raise ValueError("prize_position must be 1, 2, or 3")
        return v


class WinnerResponse(BaseModel):
    id: int
    competition_id: int
    participant_id: int
    prize_position: int
    photo_url: Optional[str] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class WinnerDetailResponse(BaseModel):
    id: int
    competition_id: int
    competition_name: str
    participant_id: int
    participant_name: str
    prize_position: int
    photo_url: Optional[str] = None


# ==========================================
# ANNOUNCEMENT SCHEMAS
# ==========================================
# Replaces the earlier placeholder AnnouncementCreate/Response
# (title/content/is_active) with the pin/publish workflow used by the
# festival announcements feature.

class AnnouncementCreate(BaseModel):
    title: str
    description: str
    event_datetime: Optional[datetime] = None
    is_pinned: bool = False
    is_published: bool = True


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_datetime: Optional[datetime] = None
    is_pinned: Optional[bool] = None
    is_published: Optional[bool] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    description: str
    event_datetime: Optional[datetime] = None
    is_pinned: bool
    is_published: bool
    created_by: Optional[int] = None
    created_by_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Emergency Contact Schemas
class EmergencyContactBase(BaseModel):
    name: str
    role: str
    phone: str

class EmergencyContactResponse(EmergencyContactBase):
    id: int
    class Config:
        from_attributes = True

# Expense Schemas
class ExpenseCreate(BaseModel):
    title: str
    category: str
    amount: float
    date: str

class ExpenseResponse(ExpenseCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Camera Schemas
class LiveCameraCreate(BaseModel):
    name: str
    stream_url: str
    is_active: bool = True

class LiveCameraResponse(LiveCameraCreate):
    id: int

    class Config:
        from_attributes = True
from datetime import datetime


class LiveChatCreate(BaseModel):
    user_name: str
    message: str


class LiveChatResponse(BaseModel):
    id: int
    user_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True
# ==============================
# Video Upload Schemas
# ==============================

class VideoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    video_url: str
    file_name: str
    file_size: int
    user_id: int
    uploader_name: str
    uploader_role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
# Sponsor Schemas
class SponsorBase(BaseModel):
    sponsor_name: str
    contact_person_name: Optional[str] = None
    sponsor_category: str = "Supporter"
    contribution_amount: Optional[float] = None
    contribution_details: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    optional_message: Optional[str] = None

class SponsorResponse(SponsorBase):
    id: int
    photo_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class SponsorStatsResponse(BaseModel):
    total_sponsors: int
    total_contribution: float
# ==========================================
# FESTIVAL SCHEDULE SCHEMAS
# ==========================================

class ScheduleItemCreate(BaseModel):
    day: int
    title: str
    description: Optional[str] = None
    date: str
    start_time: str
    end_time: Optional[str] = None
    location: str = "PUTCHAVANI TOTALU STREET"
    is_important: bool = False

    @field_validator("day")
    @classmethod
    def validate_day(cls, v):
        if v not in (1, 2, 3, 4):
            raise ValueError("day must be 1, 2, 3, or 4 (4 = Grand Nimajjanam)")
        return v


class ScheduleItemUpdate(BaseModel):
    day: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    is_important: Optional[bool] = None

    @field_validator("day")
    @classmethod
    def validate_day(cls, v):
        if v is not None and v not in (1, 2, 3, 4):
            raise ValueError("day must be 1, 2, 3, or 4 (4 = Grand Nimajjanam)")
        return v


class ScheduleItemResponse(BaseModel):
    id: int
    day: int
    title: str
    description: Optional[str] = None
    date: str
    start_time: str
    end_time: Optional[str] = None
    location: str
    is_important: bool
    created_by: Optional[int] = None
    created_by_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True