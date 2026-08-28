from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import shutil

from backend.database import get_db
from backend.models import LiveCamera, VideoItem
from backend.schemas import (
    LiveCameraCreate,
    LiveCameraResponse,
    VideoResponse
)
from backend.auth import get_current_user, get_current_volunteer_or_admin
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "uploads" / "videos"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
router = APIRouter(
    prefix="/api/live",
    tags=["live"]
)


@router.get("/", response_model=list[LiveCameraResponse])
def get_live_cameras(db: Session = Depends(get_db)):
    return (
        db.query(LiveCamera)
        .filter(LiveCamera.is_active == True)
        .all()
    )


@router.post("/", response_model=LiveCameraResponse)
def create_live_camera(
    camera: LiveCameraCreate,
    db: Session = Depends(get_db)
):
    new_camera = LiveCamera(
        name=camera.name,
        stream_url=camera.stream_url,
        is_active=camera.is_active
    )

    db.add(new_camera)
    db.commit()
    db.refresh(new_camera)

    return new_camera
@router.put("/{camera_id}", response_model=LiveCameraResponse)
def update_live_camera(
    camera_id: int,
    camera: LiveCameraCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_volunteer_or_admin)
):
    db_camera = db.query(LiveCamera).filter(LiveCamera.id == camera_id).first()

    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db_camera.name = camera.name
    db_camera.stream_url = camera.stream_url
    db_camera.is_active = camera.is_active

    db.commit()
    db.refresh(db_camera)

    return db_camera
@router.delete("/{camera_id}")
def delete_live_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_volunteer_or_admin)
):
    db_camera = db.query(LiveCamera).filter(LiveCamera.id == camera_id).first()

    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    db.delete(db_camera)
    db.commit()

    return {"message": "Camera deleted successfully"}
@router.put("/{camera_id}/toggle")
def toggle_live_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_volunteer_or_admin)
):
    camera = db.query(LiveCamera).filter(LiveCamera.id == camera_id).first()

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera.is_active = not camera.is_active

    db.commit()
    db.refresh(camera)

    return {
        "id": camera.id,
        "name": camera.name,
        "is_active": camera.is_active
    }
# ==========================================
# VIDEO UPLOAD & MANAGEMENT
# ==========================================

@router.get("/videos", response_model=list[VideoResponse])
def get_all_videos(
    db: Session = Depends(get_db)
):
    return (
        db.query(VideoItem)
        .filter(VideoItem.is_active == True)
        .order_by(VideoItem.created_at.desc())
        .all()
    )


@router.post("/videos/upload", response_model=VideoResponse)
async def upload_video(
    title: str = Form(...),
    description: str = Form(None),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Allow only video files
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(
            status_code=400,
            detail="Only video files are allowed"
        )

    # Create unique filename
    file_extension = Path(video.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"

    file_path = UPLOAD_DIR / unique_filename

    # Save uploaded video
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # Get file size
    file_size = file_path.stat().st_size

    # Save database record
    new_video = VideoItem(
        title=title,
        description=description,
        video_url=f"/static/uploads/videos/{unique_filename}",
        file_name=video.filename,
        file_size=file_size,
        user_id=current_user.id,
        uploader_name=current_user.full_name,
        uploader_role=current_user.role,
        is_active=True
    )

    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    return new_video


@router.delete("/videos/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    video = (
        db.query(VideoItem)
        .filter(
            VideoItem.id == video_id,
            VideoItem.is_active == True
        )
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found"
        )

    # DEVOTEE: own video మాత్రమే delete
    is_owner = video.user_id == current_user.id

    # ADMIN / VOLUNTEER: ఎవరి video అయినా delete చేయవచ్చు
    is_moderator = current_user.role in ["ADMIN", "VOLUNTEER"]

    if not is_owner and not is_moderator:
        raise HTTPException(
            status_code=403,
            detail="You can delete only your own videos"
        )

    # Physical video file delete
    if video.video_url:
        file_path = UPLOAD_DIR / Path(video.video_url).name

        if file_path.exists():
            file_path.unlink()

    # Database record delete
    db.delete(video)
    db.commit()

    return {
        "message": "Video deleted successfully"
    }