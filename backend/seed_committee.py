"""
Committee member seeding — fixes the root cause of the empty "Select
Volunteer" dropdown.

The bug: committee member Users were being created directly with
role="DEVOTEE" and NO corresponding Volunteer row at all. The Work/Seva
"Select Volunteer" dropdown (and every write endpoint in
routers/volunteer_tasks.py) only ever looks at the Volunteer table
filtered to status=="APPROVED" — a User existing by itself, regardless
of role, is invisible to that query. This file creates (or repairs)
the missing Volunteer row for each committee member so they actually
show up.

Safe to call on every startup:
  - Looked up by email first — never creates a duplicate User.
  - Looked up by user_id second — never creates a duplicate Volunteer.
  - Only ever touches THESE known committee emails. It never modifies
    a real applicant's pending/rejected Volunteer application.
  - Never overwrites an existing user's password (the default password
    below is only used the very first time that User row is created).

TEMPORARY DEBUG LOGGING: this file prints exactly what it found/did on
every startup (see print() calls below) so you can confirm from your
own terminal output whether this function is actually running and what
it's actually doing against your real database — instead of guessing.
Remove the print() calls once you've confirmed it's working.
"""

import uuid

from sqlalchemy.orm import Session

from backend.auth import get_password_hash
from backend.models import User, Volunteer

# Only used the first time one of these Users is created from scratch.
# Change this (or wire it to an env var) if you don't want this shared
# default left active — these are real login credentials.
DEFAULT_COMMITTEE_PASSWORD = "Vinayaka@2026"

# (email, full_name, preferred/assigned service area label)
COMMITTEE_MEMBERS = [
    ("yogesh@vinayakax.com", "Yogesh", "President"),
    ("sekhar@vinayakax.com", "Sekhar", "Vice President"),
    ("karthik@vinayakax.com", "Karthik", "Committee Member"),
    ("sanju@vinayakax.com", "Sanju", "Committee Member"),
    ("mohit@vinayakax.com", "Mohit", "Committee Member"),
    ("jagadeesh@vinayakax.com", "Jagadeesh", "Committee Member"),
    ("sentharao@vinayakax.com", "Sentharao", "Committee Member"),
    ("bhaskarrao@vinayakax.com", "Bhaskar Rao", "Committee Member"),
    ("chaitanya@vinayakax.com", "Chaitanya", "Committee Member"),
    ("kiran@vinayakax.com", "Kiran", "Committee Member"),
    ("kotesh@vinayakax.com", "Kotesh", "Committee Member"),
]


def seed_committee_volunteers(db: Session) -> None:
    print("[seed_committee] Seeding committee volunteers...")

    created_users = 0
    upgraded_roles = 0
    created_volunteers = 0
    fixed_volunteers = 0

    for email, full_name, title in COMMITTEE_MEMBERS:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(
                email=email,
                full_name=full_name,
                role="VOLUNTEER",
                hashed_password=get_password_hash(DEFAULT_COMMITTEE_PASSWORD),
            )
            db.add(user)
            db.flush()  # populate user.id before it's used below
            created_users += 1
        elif user.role == "DEVOTEE":
            # A committee member must carry role=="VOLUNTEER" to pass
            # get_current_volunteer_or_admin — this mirrors exactly what
            # routers/volunteers.py's update_volunteer() already does on
            # a normal application approval, just applied here too.
            user.role = "VOLUNTEER"
            upgraded_roles += 1

        volunteer = db.query(Volunteer).filter(Volunteer.user_id == user.id).first()

        if not volunteer:
            db.add(
                Volunteer(
                    user_id=user.id,
                    status="APPROVED",
                    assigned_work=title,
                    performance_score=5.0,
                    attendance_json="[]",
                    shifts_json="[]",
                    qr_code_token=str(uuid.uuid4())[:8],
                )
            )
            created_volunteers += 1
        elif volunteer.status != "APPROVED":
            # This list is trusted, known committee data (not a random
            # applicant's real application), so it's safe to bring it in
            # line with "committee members are approved volunteers."
            volunteer.status = "APPROVED"
            fixed_volunteers += 1

    db.commit()

    print(f"[seed_committee] users created: {created_users}, roles upgraded to VOLUNTEER: {upgraded_roles}")
    print(f"[seed_committee] volunteer rows created: {created_volunteers}, volunteer rows fixed to APPROVED: {fixed_volunteers}")

    # Prove the end state, not just what changed this run — this is the
    # number that GET /api/volunteers should return.
    final_count = db.query(Volunteer).filter(Volunteer.status == "APPROVED").count()
    print(f"[seed_committee] TOTAL approved volunteers in DB right now: {final_count}")
    if final_count == 0:
        print(
            "[seed_committee] WARNING: 0 approved volunteers after seeding. "
            "This almost always means this function is writing to a DIFFERENT "
            "database file than the one your API reads from at request time — "
            "double-check DATABASE_URL / the working directory the server was "
            "started from, and check for more than one festival.db on disk."
        )