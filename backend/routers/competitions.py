import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Competition, Participant, Winner, User
from backend.schemas import (
    CompetitionCreate,
    CompetitionResponse,
    ParticipantCreate,
    ParticipantResponse,
    WinnerResponse,
    WinnerDetailResponse,
)
from backend.auth import (
    get_current_volunteer_or_admin
)

router = APIRouter(
    prefix="/api/competitions",
    tags=["Competitions"]
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _save_photo(photo: UploadFile) -> str:
    ext = os.path.splitext(photo.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOADS_DIR / filename
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
    return f"/static/uploads/{filename}"


def _delete_photo_file(url: Optional[str]):
    if not url:
        return
    path = BASE_DIR / url.lstrip("/")
    if path.exists():
        try:
            path.unlink()
        except OSError:
            pass


# ==========================================
# COMPETITIONS - PUBLIC READ
# ==========================================

@router.get("/", response_model=list[CompetitionResponse])
def get_all_competitions(db: Session = Depends(get_db)):
    competitions = db.query(Competition).order_by(
        Competition.created_at.desc()
    ).all()

    result = []
    for competition in competitions:
        participant_count = db.query(Participant).filter(
            Participant.competition_id == competition.id
        ).count()
        result.append({
            "id": competition.id,
            "name": competition.name,
            "description": competition.description,
            "created_by": competition.created_by,
            "created_at": competition.created_at,
            "participant_count": participant_count
        })

    return result


# ==========================================
# COMPETITIONS - ADMIN / VOLUNTEER MANAGEMENT
# ==========================================

@router.post("/", response_model=CompetitionResponse)
def create_competition(
    data: CompetitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    existing = db.query(Competition).filter(
        Competition.name.ilike(data.name.strip())
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Competition already exists"
        )

    competition = Competition(
        name=data.name.strip(),
        description=data.description,
        created_by=current_user.id
    )

    db.add(competition)
    db.commit()
    db.refresh(competition)

    return {
        "id": competition.id,
        "name": competition.name,
        "description": competition.description,
        "created_by": competition.created_by,
        "created_at": competition.created_at,
        "participant_count": 0
    }


@router.put("/{competition_id}", response_model=CompetitionResponse)
def update_competition(
    competition_id: int,
    data: CompetitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    competition = db.query(Competition).filter(
        Competition.id == competition_id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    duplicate = db.query(Competition).filter(
        Competition.name.ilike(data.name.strip()),
        Competition.id != competition_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Another competition with this name already exists"
        )

    competition.name = data.name.strip()
    competition.description = data.description

    db.commit()
    db.refresh(competition)

    participant_count = db.query(Participant).filter(
        Participant.competition_id == competition.id
    ).count()

    return {
        "id": competition.id,
        "name": competition.name,
        "description": competition.description,
        "created_by": competition.created_by,
        "created_at": competition.created_at,
        "participant_count": participant_count
    }


@router.delete("/{competition_id}")
def delete_competition(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    competition = db.query(Competition).filter(
        Competition.id == competition_id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    # The ORM already cascades DB-level deletes for participants and winners
    # (Competition.participants / Competition.winners use cascade="all, delete-orphan").
    # We only need to manually clean up winner photo FILES here, since cascade
    # only removes DB rows, not files on disk.
    winners = db.query(Winner).filter(
        Winner.competition_id == competition_id
    ).all()
    for winner in winners:
        _delete_photo_file(winner.photo_url)

    db.delete(competition)
    db.commit()

    return {"message": "Competition and related participants/winners deleted successfully"}


# ==========================================
# PARTICIPANTS
# ==========================================

@router.get(
    "/{competition_id}/participants",
    response_model=list[ParticipantResponse]
)
def get_participants(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    competition = db.query(Competition).filter(
        Competition.id == competition_id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    return db.query(Participant).filter(
        Participant.competition_id == competition_id
    ).order_by(
        Participant.created_at.desc()
    ).all()


@router.post(
    "/participants",
    response_model=ParticipantResponse
)
def register_participant(
    data: ParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    competition = db.query(Competition).filter(
        Competition.id == data.competition_id
    ).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    participant = Participant(
        full_name=data.full_name.strip(),
        age=data.age,
        phone=data.phone.strip(),
        competition_id=data.competition_id,
        registered_by=current_user.id
    )

    db.add(participant)
    db.commit()
    db.refresh(participant)

    return participant


# ==========================================
# WINNERS - PUBLIC READ
# ==========================================

@router.get("/winners/all", response_model=List[WinnerDetailResponse])
def get_all_winners(db: Session = Depends(get_db)):
    winners = db.query(Winner).order_by(
        Winner.competition_id.asc(),
        Winner.prize_position.asc()
    ).all()

    result = []
    for winner in winners:
        # Uses the ORM relationships defined on the Winner model
        # (winner.competition / winner.participant) instead of re-querying.
        result.append(WinnerDetailResponse(
            id=winner.id,
            competition_id=winner.competition_id,
            competition_name=winner.competition.name if winner.competition else "Unknown",
            participant_id=winner.participant_id,
            participant_name=winner.participant.full_name if winner.participant else "Unknown",
            prize_position=winner.prize_position,
            photo_url=winner.photo_url
        ))

    return result


# ==========================================
# WINNERS - ADMIN / VOLUNTEER MANAGEMENT
# ==========================================

@router.post("/winners", response_model=WinnerResponse)
def create_winner(
    competition_id: int = Form(...),
    participant_id: int = Form(...),
    prize_position: int = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    if prize_position not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="prize_position must be 1, 2, or 3")

    competition = db.query(Competition).filter(Competition.id == competition_id).first()
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if participant.competition_id != competition_id:
        raise HTTPException(
            status_code=400,
            detail="Selected participant is not registered in this competition"
        )

    position_taken = db.query(Winner).filter(
        Winner.competition_id == competition_id,
        Winner.prize_position == prize_position
    ).first()
    if position_taken:
        raise HTTPException(
            status_code=400,
            detail=f"Position {prize_position} is already assigned for this competition"
        )

    already_winner = db.query(Winner).filter(
        Winner.competition_id == competition_id,
        Winner.participant_id == participant_id
    ).first()
    if already_winner:
        raise HTTPException(
            status_code=400,
            detail="This participant already has a winner entry for this competition"
        )

    photo_url = _save_photo(photo) if photo and photo.filename else None

    winner = Winner(
        competition_id=competition_id,
        participant_id=participant_id,
        prize_position=prize_position,
        photo_url=photo_url,
        created_by=current_user.id
    )

    db.add(winner)
    db.commit()
    db.refresh(winner)

    return winner


@router.put("/winners/{winner_id}", response_model=WinnerResponse)
def update_winner(
    winner_id: int,
    competition_id: int = Form(...),
    participant_id: int = Form(...),
    prize_position: int = Form(...),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    winner = db.query(Winner).filter(Winner.id == winner_id).first()
    if not winner:
        raise HTTPException(status_code=404, detail="Winner not found")

    if prize_position not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="prize_position must be 1, 2, or 3")

    competition = db.query(Competition).filter(Competition.id == competition_id).first()
    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if participant.competition_id != competition_id:
        raise HTTPException(
            status_code=400,
            detail="Selected participant is not registered in this competition"
        )

    position_taken = db.query(Winner).filter(
        Winner.competition_id == competition_id,
        Winner.prize_position == prize_position,
        Winner.id != winner_id
    ).first()
    if position_taken:
        raise HTTPException(
            status_code=400,
            detail=f"Position {prize_position} is already assigned for this competition"
        )

    already_winner = db.query(Winner).filter(
        Winner.competition_id == competition_id,
        Winner.participant_id == participant_id,
        Winner.id != winner_id
    ).first()
    if already_winner:
        raise HTTPException(
            status_code=400,
            detail="This participant already has a winner entry for this competition"
        )

    if photo and photo.filename:
        _delete_photo_file(winner.photo_url)
        winner.photo_url = _save_photo(photo)

    winner.competition_id = competition_id
    winner.participant_id = participant_id
    winner.prize_position = prize_position

    db.commit()
    db.refresh(winner)

    return winner


@router.delete("/winners/{winner_id}")
def delete_winner(
    winner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_volunteer_or_admin)
):
    winner = db.query(Winner).filter(Winner.id == winner_id).first()
    if not winner:
        raise HTTPException(status_code=404, detail="Winner not found")

    _delete_photo_file(winner.photo_url)

    db.delete(winner)
    db.commit()

    return {"message": "Winner deleted successfully"}