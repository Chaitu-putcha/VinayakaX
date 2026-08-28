import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="DEVOTEE")  # ADMIN, VOLUNTEER, DEVOTEE
    profile_image_url = Column(String, nullable=True)  # ADDED: profile photo support
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Forgot Password Fields
    reset_otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    otp_verified = Column(Boolean, default=False)

    
    # Relationships
    volunteer_profile = relationship("Volunteer", back_populates="user", uselist=False)
    gallery_items = relationship("GalleryItem", back_populates="user")
    videos = relationship("VideoItem", back_populates="user")

class Volunteer(Base):
    __tablename__ = "volunteers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    assigned_work = Column(String, nullable=True)
    performance_score = Column(Float, default=5.0)
    attendance_json = Column(String, default="[]")  # JSON representation of list of active check-in dates
    shifts_json = Column(String, default="[]")       # JSON list of shifts: [{"date":"...", "time":"...", "task":"..."}]
    qr_code_token = Column(String, unique=True, index=True, nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    user = relationship("User", back_populates="volunteer_profile")
    duties = relationship("DutyAssignment", back_populates="volunteer", cascade="all, delete-orphan")
    tasks = relationship("VolunteerTask", back_populates="volunteer", cascade="all, delete-orphan")


class DutyAssignment(Base):
    """NEW: real duty scheduling + check-in/check-out attendance tracking."""
    __tablename__ = "duty_assignments"

    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=False)

    service_area = Column(String, nullable=False)   # e.g. "Prasadam Distribution"
    duty_date = Column(String, nullable=False)       # YYYY-MM-DD
    location = Column(String, nullable=False)        # e.g. "Main Mandapam"
    shift = Column(String, nullable=False)            # e.g. "Evening (5:00 PM - 9:00 PM)"

    status = Column(String, default="NOT_STARTED")   # NOT_STARTED, CHECKED_IN, CHECKED_OUT
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)

    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    volunteer = relationship("Volunteer", back_populates="duties")


class VolunteerTask(Base):
    """Seva / Work Assignment Management.

    Separate from DutyAssignment on purpose:
      - DutyAssignment = shift + check-in/check-out attendance system.
      - VolunteerTask   = specific, freely-named work/seva a committee
        member (Admin or an APPROVED Volunteer) assigns to a volunteer,
        e.g. "Prasadam Distribution", "Stage Decoration", or any other
        custom text the manager types in.

    One Volunteer -> Many VolunteerTask records (a volunteer can have
    several sevas across several dates/times).
    """
    __tablename__ = "volunteer_tasks"

    id = Column(Integer, primary_key=True, index=True)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=False)

    task_title = Column(String, nullable=False)     # free-text work/seva name
    description = Column(Text, nullable=True)
    service_area = Column(String, nullable=True)

    duty_date = Column(String, nullable=False)        # YYYY-MM-DD
    start_time = Column(String, nullable=False)       # HH:MM (24h, from <input type="time">)
    end_time = Column(String, nullable=True)           # HH:MM (24h)

    location = Column(String, nullable=True)
    priority = Column(String, default="NORMAL")        # LOW, NORMAL, HIGH, URGENT
    status = Column(String, default="ASSIGNED")         # ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    cancellation_reason = Column(String, nullable=True)

    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    audit_log_json = Column(Text, default="[]")  # JSON list of {action, by, by_name, at, details}
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    volunteer = relationship("Volunteer", back_populates="tasks")
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])


class ServiceArea(Base):
    """Dynamically managed list of seva/work service areas (e.g. "Prasadam
    Distribution", "Crowd Control & Security"). Replaces the old hardcoded
    frontend dropdown — ADMIN and APPROVED VOLUNTEER can add/edit/delete
    entries here, and both the Volunteer application's "Preferred Area of
    Service" dropdown and the Work/Seva assignment form load this list
    live from the database.

    VolunteerTask.service_area stores the area's NAME as plain text
    (not a foreign key) on purpose: if a ServiceArea entry is later
    edited or deleted, existing task records keep whatever label they
    were assigned at the time, instead of breaking or cascading.
    """
    __tablename__ = "service_areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )


class Donation(Base):
    """Devotee Contributions & Recognition record.

    NOTE: This model intentionally has NO payment-gateway fields
    (no transaction_id, payment_method, status, receipt_number, is_anonymous).
    This app does not process payments; it only records devotee/family
    contributions that were collected offline, for recognition purposes.

    Privacy: contribution_amount, phone_number and address are PRIVATE
    (management-only). Public responses must never expose them — see
    DonationPublicResponse / DonationManageResponse in schemas.py.
    """
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)

    donor_name = Column(String, nullable=False, default="Devotee")
    family_name = Column(String, nullable=True)

    contribution_amount = Column(Float, nullable=False)  # PRIVATE
    contribution_purpose = Column(String, default="General Festival Contribution")

    phone_number = Column(String, nullable=True)  # PRIVATE
    address = Column(String, nullable=True)        # PRIVATE

    photo_url = Column(String, nullable=True)
    optional_message = Column(String, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class GalleryItem(Base):
    __tablename__ = "gallery_items"
    
    id = Column(Integer, primary_key=True, index=True)
    uploader_name = Column(String, default="Devotee")
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, default="PHOTO")  # PHOTO, VIDEO
    url = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    likes_count = Column(Integer, default=0)
    favorite_users_json = Column(Text, default="[]")
    liked_users_json = Column(String, default="[]") # JSON list of user emails who liked
    comments_json = Column(String, default="[]")     # JSON list of comments: [{"name":"...", "text":"...", "date":"..."}]
    is_approved = Column(Boolean, default=False)
    album = Column(String, default="General")        # Harathi, Cultural, Nimajjanam, Decoration, General
    ai_tags = Column(String, default="")             # Comma-separated tags (e.g. ganesha, yellow, flower)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="gallery_items")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    date = Column(String, nullable=False)          # YYYY-MM-DD
    time = Column(String, nullable=False)          # 06:30 PM

    location = Column(String, default="PUTCHAVANI TOTALU STREET")
    category = Column(String, default="Pooja")

    image_url = Column(String, nullable=True)

    created_by = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow
    )

# ==========================================
# COMPETITION MANAGEMENT
# ==========================================

class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    participants = relationship(
        "Participant",
        back_populates="competition",
        cascade="all, delete-orphan"
    )

    winners = relationship(
        "Winner",
        back_populates="competition",
        cascade="all, delete-orphan"
    )


# ==========================================
# PARTICIPANT MANAGEMENT
# ==========================================

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    phone = Column(String, nullable=False)

    photo_url = Column(String, nullable=True)

    competition_id = Column(
        Integer,
        ForeignKey("competitions.id"),
        nullable=False
    )

    registered_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    competition = relationship(
        "Competition",
        back_populates="participants"
    )


# ==========================================
# WINNER MANAGEMENT
# ==========================================

class Winner(Base):
    __tablename__ = "winners"

    id = Column(Integer, primary_key=True, index=True)

    competition_id = Column(
        Integer,
        ForeignKey("competitions.id"),
        nullable=False
    )

    participant_id = Column(
        Integer,
        ForeignKey("participants.id"),
        nullable=False
    )

    prize_position = Column(Integer, nullable=False)

    photo_url = Column(String, nullable=True)

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow
    )

    competition = relationship(
        "Competition",
        back_populates="winners"
    )

    participant = relationship("Participant")


# ==========================================
# ANNOUNCEMENT MANAGEMENT
# ==========================================
# NOTE: this replaces the earlier placeholder Announcement model
# (title/content/is_active) which had no router wired up in main.py and
# no data depending on it. Fields below match the festival announcement
# feature: pin/publish workflow, event date/time, and attribution to the
# ADMIN/VOLUNTEER who created it.

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(String, nullable=False)

    event_datetime = Column(DateTime, nullable=True)  # optional date/time the announcement refers to

    is_pinned = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow
    )

    creator = relationship("User")

    @property
    def created_by_name(self) -> str:
        return self.creator.full_name if self.creator else "Committee"


class Notification(Base):
    """Per-user notification/message. Used by the Volunteer Work/Seva
    system to tell a volunteer when their assignment is created,
    updated, cancelled, or has its status changed — but written as a
    general-purpose model so anything else in the app can reuse it
    later instead of building a second notification system.
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    notif_type = Column(String, default="INFO")  # WORK_ASSIGNED, WORK_UPDATED, WORK_CANCELLED, STATUS_CHANGED, INFO
    related_task_id = Column(Integer, nullable=True)

    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Police, Ambulance, Fire, Committee Lead, Temple Doctor
    phone = Column(String, nullable=False)

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, default="Decoration")  # Food, Decoration, Music, Electricity, Prizes, Misc
    amount = Column(Float, nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LiveCamera(Base):
    __tablename__ = "live_cameras"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    stream_type = Column(String, default="youtube")

    stream_url = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)



class LiveChat(Base):
    __tablename__ = "live_chat"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
class VideoItem(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    video_url = Column(String, nullable=False)

    file_name = Column(String, nullable=False)

    file_size = Column(Integer, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    uploader_name = Column(String, nullable=False)
    uploader_role = Column(String, default="DEVOTEE")

    is_active = Column(Boolean, default=True)

    created_at = Column(
    DateTime,
    default=datetime.datetime.utcnow
)

    user = relationship("User", back_populates="videos")
class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(Integer, primary_key=True, index=True)

    sponsor_name = Column(String, nullable=False)
    contact_person_name = Column(String, nullable=True)
    sponsor_category = Column(String, default="Supporter")  # Platinum Sponsor, Gold Sponsor, Silver Sponsor, Supporter

    contribution_amount = Column(Float, nullable=True)
    contribution_details = Column(String, nullable=True)  # "Sponsored For"

    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)

    photo_url = Column(String, nullable=True)
    optional_message = Column(String, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
class FestivalSchedule(Base):
    __tablename__ = "festival_schedule"

    id = Column(Integer, primary_key=True, index=True)

    day = Column(Integer, nullable=False)  # 1, 2, 3, or 4 (4 = Grand Nimajjanam)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    date = Column(String, nullable=False)          # YYYY-MM-DD
    start_time = Column(String, nullable=False)    # e.g. 06:30 PM
    end_time = Column(String, nullable=True)        # optional

    location = Column(String, default="PUTCHAVANI TOTALU STREET")
    is_important = Column(Boolean, default=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow
    )

    creator = relationship("User")

    @property
    def created_by_name(self) -> str:
        return self.creator.full_name if self.creator else "Committee"