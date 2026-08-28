from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import LiveChat
from backend.schemas import LiveChatCreate, LiveChatResponse
from backend.auth import get_current_volunteer_or_admin

router = APIRouter(
    prefix="/api/live-chat",
    tags=["Live Chat"]
)


# Get last 50 messages
@router.get("/", response_model=list[LiveChatResponse])
def get_messages(db: Session = Depends(get_db)):
    return (
        db.query(LiveChat)
        .order_by(LiveChat.created_at.desc())
        .limit(50)
        .all()[::-1]
    )


# Send message
@router.post("/", response_model=LiveChatResponse)
def send_message(
    chat: LiveChatCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_volunteer_or_admin)
):
    new_chat = LiveChat(
        user_name=chat.user_name,
        message=chat.message
    )

    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)

    return new_chat


# Delete message
@router.delete("/{chat_id}")
def delete_message(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_volunteer_or_admin)
):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Message not found")

    db.delete(chat)
    db.commit()

    return {"message": "Deleted successfully"}