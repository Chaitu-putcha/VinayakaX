import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.auth import get_current_user

router = APIRouter(
    prefix="/api/profile",
    tags=["Profile Photo"]
)

@router.post("/photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a profile photo using the exact same static-file saving approach 
    as gallery.py, and updates the user's profile_image_url.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    # Same absolute Path setup as gallery.py
    BASE_DIR = Path(__file__).resolve().parent.parent
    UPLOADS_DIR = BASE_DIR / "static" / "uploads" / "profiles"
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Clean up the old profile photo if it exists
    if current_user.profile_image_url:
        old_file_path = BASE_DIR / current_user.profile_image_url.lstrip("/")
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except Exception as e:
                print(f"Warning: Could not delete old profile photo: {e}")

    # Save file synchronously using shutil, matching gallery.py
    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = UPLOADS_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return URL matches the static mount
    image_url = f"/static/uploads/profiles/{filename}"

    current_user.profile_image_url = image_url
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile photo uploaded successfully", 
        "url": image_url,
        "profile_image_url": image_url
    }

@router.delete("/photo")
def delete_profile_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes the user's current profile photo from disk and clears the database field.
    """
    if current_user.profile_image_url:
        BASE_DIR = Path(__file__).resolve().parent.parent
        file_path = BASE_DIR / current_user.profile_image_url.lstrip("/")
        
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        
        current_user.profile_image_url = None
        db.commit()
        
    return {"message": "Profile photo deleted successfully"}