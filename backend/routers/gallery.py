from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import datetime
import os
import shutil
import uuid
from fastapi import Form
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from backend.database import get_db
from backend.models import GalleryItem, User
from backend.schemas import GalleryItemResponse, GalleryItemCreate, CommentCreate
from backend.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/gallery", tags=["gallery"])
def add_watermark(image_path):
    image = Image.open(image_path).convert("RGBA")

    txt = Image.new("RGBA", image.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(txt)

    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except:
        font = ImageFont.load_default()

    text = "UDDANAM RAMAKRISHNA PURAM\nSri Vinayaka Navarathri 2026"

    draw.multiline_text(
        (20, image.height - 80),
        text,
        fill=(255, 255, 255, 120),
        font=font,
    )

    watermarked = Image.alpha_composite(image, txt)

    watermarked.convert("RGB").save(image_path)

@router.post("", response_model=GalleryItemResponse)
def upload_item(item_in: GalleryItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Auto-tag helper based on caption
    inferred_tags = []
    caption_lower = (item_in.caption or "").lower()
    if "ganesha" in caption_lower or "ganpati" in caption_lower or "lord" in caption_lower:
        inferred_tags.append("ganesha")
    if "decoration" in caption_lower or "mandapam" in caption_lower or "stage" in caption_lower:
        inferred_tags.append("decoration")
    if "harathi" in caption_lower or "pooja" in caption_lower or "aarti" in caption_lower:
        inferred_tags.append("harathi")
    if "food" in caption_lower or "prasadam" in caption_lower or "laddoo" in caption_lower:
        inferred_tags.append("prasadam")
    if "cultural" in caption_lower or "dance" in caption_lower or "song" in caption_lower:
        inferred_tags.append("cultural")
        
    user_tags = item_in.ai_tags or ""
    all_tags = set([t.strip() for t in user_tags.split(",") if t.strip()] + inferred_tags)
    
    db_item = GalleryItem(
        user_id=current_user.id,
        uploader_name=current_user.full_name,
        type=item_in.type,
        url=item_in.url,
        caption=item_in.caption,
        album=item_in.album,
        ai_tags=",".join(all_tags),
        is_approved=True  # requires admin approval
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("", response_model=List[GalleryItemResponse])
def get_approved_gallery(
    album: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(GalleryItem).filter(GalleryItem.is_approved == True)
    
    if album and album != "All":
        query = query.filter(GalleryItem.album == album)
        
    if search:
        search_term = f"%{search.lower()}%"
        # Match caption or tags (using ILIKE/like)
        query = query.filter(
            GalleryItem.caption.ilike(search_term) | 
            GalleryItem.ai_tags.ilike(search_term) | 
            GalleryItem.album.ilike(search_term)
        )
        
    return query.order_by(GalleryItem.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/pending", response_model=List[GalleryItemResponse])
def get_pending_gallery(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(GalleryItem).filter(GalleryItem.is_approved == False).all()

@router.put("/{item_id}/approve", response_model=GalleryItemResponse)
def approve_gallery_item(item_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    item.is_approved = True
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_gallery_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Gallery item not found"
        )

    # Owner / Admin / Volunteer matrame delete cheyyagalaru
    if (
        item.user_id != current_user.id
        and current_user.role not in ["ADMIN", "VOLUNTEER"]
    ):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this photo."
        )

    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    image_path = BASE_DIR / item.url.lstrip("/")

    if image_path.exists():
        image_path.unlink()

    db.delete(item)
    db.commit()

    return {"detail": "Photo deleted successfully"}
@router.put("/{item_id}", response_model=GalleryItemResponse)
def update_gallery_item(
    item_id: int,
    item_in: GalleryItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")

    # Owner / Admin / Volunteer only
    if (
        item.user_id != current_user.id
        and current_user.role not in ["ADMIN", "VOLUNTEER"]
    ):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to edit this photo."
        )

    item.caption = item_in.caption
    item.album = item_in.album
    item.ai_tags = item_in.ai_tags
    item.type = item_in.type

    db.commit()
    db.refresh(item)

    return item
@router.post("/{item_id}/like", response_model=GalleryItemResponse)
def like_gallery_item(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
        
    try:
        liked_users = json.loads(item.liked_users_json)
    except Exception:
        liked_users = []
        
    if current_user.email in liked_users:
        # Unlike
        liked_users.remove(current_user.email)
        item.likes_count = max(0, item.likes_count - 1)
    else:
        # Like
        liked_users.append(current_user.email)
        item.likes_count += 1
        
    item.liked_users_json = json.dumps(liked_users)
    db.commit()
    db.refresh(item)
    return item
@router.post("/{item_id}/favorite", response_model=GalleryItemResponse)
def favorite_gallery_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")

    try:
        favorites = json.loads(item.favorite_users_json or "[]")
    except:
        favorites = []

    if current_user.email in favorites:
        favorites.remove(current_user.email)
    else:
        favorites.append(current_user.email)

    item.favorite_users_json = json.dumps(favorites)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/{item_id}/comment/{comment_index}")
def delete_comment(
    item_id: int,
    comment_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(GalleryItem).filter(
        GalleryItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Photo not found",
        )

    comments = json.loads(item.comments_json or "[]")

    if comment_index >= len(comments):
        raise HTTPException(
            status_code=404,
            detail="Comment not found",
        )

    comment = comments[comment_index]

    is_owner = (
        comment.get("name")
        == current_user.full_name
    )

    is_admin = current_user.role in [
        "ADMIN",
        "VOLUNTEER",
    ]

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Permission denied",
        )

    comments.pop(comment_index)

    item.comments_json = json.dumps(comments)

    db.commit()

    return {
        "message": "Comment deleted successfully"
    }
@router.post("/{item_id}/comment", response_model=GalleryItemResponse)
def comment_on_gallery_item(item_id: int, comment_in: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(GalleryItem).filter(GalleryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
        
    try:
        comments = json.loads(item.comments_json)
    except Exception:
        comments = []
        
    new_comment = {
        "name": current_user.full_name,
        "text": comment_in.text,
        "date": datetime.datetime.utcnow().isoformat()
    }
    comments.append(new_comment)
    item.comments_json = json.dumps(comments)
    db.commit()
    db.refresh(item)
    return item
@router.post("/upload")
def upload_photos(
    files: List[UploadFile] = File(...),
    caption: str = Form(""),
    album: str = Form("General"),
    tags: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    UPLOADS_DIR = BASE_DIR / "static" / "uploads"

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    uploaded = []

    for file in files:
        filename = f"{uuid.uuid4()}_{file.filename}"
        filepath = UPLOADS_DIR / filename

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print("Saved file:", filepath)
        add_watermark(filepath)

        item = GalleryItem(
            user_id=current_user.id,
            uploader_name=current_user.full_name,
            type="PHOTO",
            url=f"/static/uploads/{filename}",
            caption=caption if caption else file.filename,
            album=album,
            ai_tags=tags,
            is_approved=True
        )

        db.add(item)
        uploaded.append(item)

    db.commit()

    return {
        "message": f"{len(uploaded)} photos uploaded successfully"
    }