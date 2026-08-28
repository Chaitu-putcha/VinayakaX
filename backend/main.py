import os
import time
import logging
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from backend.routers import live_chat
from backend.config import settings
print("BREVO API KEY:", settings.BREVO_API_KEY[:10] if settings.BREVO_API_KEY else "EMPTY")
from backend.database import engine, Base, SessionLocal
from backend.routers import auth, volunteers, donations, gallery, events, admin, chatbot, competitions, sponsors, announcements, schedule
from backend.routers import live
from backend.routers import competitions
from backend.routers import volunteer_tasks, service_areas, notifications as notifications_router
from backend.seed_committee import seed_committee_volunteers
from backend.profile_photo_router import router as profile_photo_router

logger = logging.getLogger("uvicorn.error")


def _reconcile_donations_table():
    """
    Base.metadata.create_all() only CREATES tables that don't exist yet — it
    never ALTERs an existing one. models.py's own comment on the Donation
    model ("intentionally has NO payment-gateway fields — no transaction_id,
    payment_method, status, receipt_number, is_anonymous") implies an EARLIER
    version of this table had those columns. If that old table is still in
    the dev SQLite file with e.g. `transaction_id` defined NOT NULL, every
    INSERT from the current model (which never sets that column) throws
    sqlite3.IntegrityError -> an unhandled 500 on every single POST/PUT to
    /api/donations, regardless of payload.

    ALTER TABLE ADD COLUMN can add missing columns but cannot safely drop or
    relax an old NOT NULL column in SQLite. So instead: if the existing
    table's columns don't exactly match the current model, rename the old
    table out of the way (never delete it — your old rows are preserved
    under the backup name) and let create_all() build a fresh, correctly
    shaped `donations` table right after this runs. Only touches the
    `donations` table; every other table is untouched.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "donations" not in inspector.get_table_names():
        return  # doesn't exist yet — create_all() will make a fresh, correct one

    expected_columns = {
        "id", "donor_name", "family_name", "contribution_amount",
        "contribution_purpose", "phone_number", "address", "photo_url",
        "optional_message", "created_by", "created_at",
    }
    existing_columns = {col["name"] for col in inspector.get_columns("donations")}

    if existing_columns == expected_columns:
        return  # already matches the current model — nothing to do

    backup_name = f"donations_legacy_{int(time.time())}"
    print(
        f"[startup] donations table schema does not match the current model "
        f"(existing columns={sorted(existing_columns)}, "
        f"expected columns={sorted(expected_columns)}). "
        f"This is almost certainly why POST /api/donations was throwing a 500. "
        f"Renaming the old table to '{backup_name}' (your existing rows are "
        f"preserved there, NOT deleted) and creating a fresh, correctly-shaped "
        f"'donations' table."
    )
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE donations RENAME TO {backup_name}"))


def _reconcile_announcements_table():
    """
    Same problem as donations, same fix. The Announcement model used to be
    a bare title/content/is_active placeholder with no router wired up to
    it. The new announcement feature's model has a different shape
    (description, event_datetime, is_pinned, is_published, created_by,
    updated_at). If a dev SQLite file already has an `announcements` table
    in the old shape, create_all() will silently leave it as-is and every
    INSERT from the new router (which never sets `content`/`is_active`)
    will throw sqlite3.IntegrityError.

    Since the old table was never actually served by any endpoint, there
    is no real user-facing data to lose here — but we still rename rather
    than drop, so nothing is deleted if that assumption is ever wrong.
    Only touches the `announcements` table; every other table is
    untouched.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "announcements" not in inspector.get_table_names():
        return  # doesn't exist yet — create_all() will make a fresh, correct one

    expected_columns = {
        "id", "title", "description", "event_datetime",
        "is_pinned", "is_published", "created_by", "created_at", "updated_at",
    }
    existing_columns = {col["name"] for col in inspector.get_columns("announcements")}

    if existing_columns == expected_columns:
        return  # already matches the current model — nothing to do

    backup_name = f"announcements_legacy_{int(time.time())}"
    print(
        f"[startup] announcements table schema does not match the current model "
        f"(existing columns={sorted(existing_columns)}, "
        f"expected columns={sorted(expected_columns)}). "
        f"Renaming the old table to '{backup_name}' (existing rows preserved "
        f"there, NOT deleted) and creating a fresh, correctly-shaped "
        f"'announcements' table."
    )
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE announcements RENAME TO {backup_name}"))


def _ensure_volunteer_tasks_audit_column():
    """
    Fixes: sqlite3.OperationalError: no such column: volunteer_tasks.audit_log_json

    The VolunteerTask model has an `audit_log_json` column, but
    Base.metadata.create_all() ONLY creates tables that don't exist yet —
    it never ALTERs an existing table. If `volunteer_tasks` was created
    before `audit_log_json` was added to the model, every SELECT that
    touches VolunteerTask (list, stats, conflict-check, create, etc.)
    throws this OperationalError, which surfaces in the browser as the
    connection dying mid-request (misleadingly reported as "backend
    unreachable" / "failed to fetch" — the request DID reach FastAPI,
    it crashed while running the query).

    This is a single, purely additive column with a constant default, so
    (unlike the donations/announcements reconciliation above, which had
    to rename+recreate for a full shape mismatch) a plain ALTER TABLE ADD
    COLUMN is the correct, safe fix here: SQLite applies the DEFAULT
    value to every existing row immediately, and no data is lost or
    touched otherwise. Only runs if the column is actually missing.
    """
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "volunteer_tasks" not in inspector.get_table_names():
        return  # doesn't exist yet — create_all() will make a fresh, correct one

    existing_columns = {col["name"] for col in inspector.get_columns("volunteer_tasks")}
    if "audit_log_json" in existing_columns:
        return  # already matches the current model — nothing to do

    print(
        "[startup] volunteer_tasks.audit_log_json column is missing "
        "(this is why VolunteerTask queries were crashing with "
        "'no such column'). Adding it via ALTER TABLE — all existing "
        "rows are preserved, and each gets the default value '[]'."
    )
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE volunteer_tasks ADD COLUMN audit_log_json TEXT DEFAULT '[]'"))
    print("[startup] volunteer_tasks.audit_log_json column added successfully.")


_reconcile_donations_table()
_reconcile_announcements_table()
_ensure_volunteer_tasks_audit_column()

# Create database tables (creates fresh `donations`/`announcements` tables
# if they were just renamed above, and creates any other missing tables —
# including the new `volunteer_tasks`, `service_areas`, and `notifications`
# tables — as before)
Base.metadata.create_all(bind=engine)

# Ensure the 9 committee members have a User + an APPROVED Volunteer row
# (fixes the "Select Volunteer" dropdown being empty — see
# backend/seed_committee.py for the full explanation). Safe to run on
# every startup: it only creates what's missing and never touches a real
# applicant's own Volunteer record.
print(f"[startup] Using database: {settings.DATABASE_URL}")
_seed_db = SessionLocal()
try:
    seed_committee_volunteers(_seed_db)
finally:
    _seed_db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-grade festival management system for UDDANAM RAMAKRISHNA PURAM",
    version="1.0.0"
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    WHY THIS FIXES THE "CORS" ERROR:
    FastAPI/Starlette's middleware stack is layered as
    ServerErrorMiddleware -> CORSMiddleware -> ExceptionMiddleware -> routes.
    An UNHANDLED exception propagates all the way up past CORSMiddleware to
    the outermost ServerErrorMiddleware, which builds its own bare-bones
    plain-text 500 response OUTSIDE CORSMiddleware's reach — so that
    response never gets an Access-Control-Allow-Origin header, and the
    browser reports "blocked by CORS policy" even though CORS config was
    never actually the problem.

    This handler is registered via @app.exception_handler, so it runs
    INSIDE ExceptionMiddleware, which sits below CORSMiddleware — its
    JSONResponse DOES pass back through CORSMiddleware and gets proper CORS
    headers attached, on every route, not just donations. It also logs the
    full traceback so the real exception is visible in the backend terminal
    instead of being silently converted to an unexplained 500.
    """
    logger.error(
        "Unhandled exception on %s %s:\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {exc.__class__.__name__}: {exc}"},
    )


# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static directory (absolute path)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
# Include routers
app.include_router(auth.router)
app.include_router(volunteers.router)
app.include_router(volunteer_tasks.router)
app.include_router(service_areas.router)
app.include_router(notifications_router.router)
app.include_router(donations.router)
app.include_router(gallery.router)
app.include_router(events.router)
app.include_router(admin.router)
app.include_router(chatbot.router)
app.include_router(live.router)
app.include_router(live_chat.router)
app.include_router(competitions.router)
app.include_router(sponsors.router)
app.include_router(announcements.router)
app.include_router(schedule.router)
app.include_router(auth.router)
app.include_router(profile_photo_router)

# TEMPORARY DEBUG LOGGING — remove once routing is confirmed correct.
# Prints EVERY route FastAPI actually registered, with its methods, so
# there is no more guessing about whether e.g. /api/volunteers/all or
# /api/volunteers really exist. Look for these two lines specifically
# in your terminal right after startup:
#   /api/volunteers                 {'GET'}
#   /api/volunteers/all             {'GET'}
print("\n[startup] ==== REGISTERED ROUTES ====")
for _route in app.routes:
    _methods = getattr(_route, "methods", None)
    _path = getattr(_route, "path", None)
    if _path and _methods:
        print(f"  {_path:<40} {_methods}")
print("[startup] ==== END ROUTE LIST ====\n")


@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API Server!",
        "status": "Online",
        "timestamp": "2026-07-26T15:43:00+05:30"
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )