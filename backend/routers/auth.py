from urllib import request
from sqlalchemy import or_
from fastapi import APIRouter, Depends, HTTPException, status
from httpx import request
from backend.services.email_service import send_otp_email
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import datetime
import random

from backend.database import get_db
from backend.models import User, Volunteer
from backend.schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserLogin,
    Token,
    ChangePassword,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
)
from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

def seed_default_admin(db: Session):
    admin = db.query(User).filter(
        User.email == "srivinayaka.admin@gmail.com"
    ).first()

    if not admin:
        hashed_password = get_password_hash("admin@123")

        admin_user = User(
            email="srivinayaka.admin@gmail.com",
            full_name="Sri Vinayaka Super Admin",
            role="ADMIN",
            hashed_password=hashed_password
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("✅ Super Admin Created")
        
        # Also seed some default committee users for profile cards
        committee_members = [
            ("yogesh@vinayakax.com", "Yogesh", "President"),
            ("sekhar@vinayakax.com", "Sekhar", "Vice President"),
            ("karthik@vinayakax.com", "Karthik", "Committee Member"),
            ("sanju@vinayakax.com", "Sanju", "Committee Member"),
            ("mohith@vinayakax.com", "Mohith", "Committee Member"),
            ("jagadeesh@vinayakax.com", "Jagadeesh", "Committee Member"),
            ("sentharao@vinayakax.com", "Sentharao", "Committee Member"),
            ("bhaskarrao@vinayakax.com", "Bhaskar Rao", "Committee Member"),
            ("chaitanya@vinayakax.com", "Chaitanya", "Committee Member"),
            ("kiran@vinayakax.com", "Kiran", "Committee Member"),
            ("kotesh@vinayakax.com", "Kotesh", "Committee Member"),
        ]
        for email, name, role in committee_members:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(
                    email=email,
                    full_name=name,
                    role="VOLUNTEER",
                    hashed_password=hashed_password
                ))
        db.commit()

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Auto-seed first to ensure admin exists
    seed_default_admin(db)
    
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if it should be a volunteer (mock logic or default)
    # The default registered user is a DEVOTEE, but if they want to volunteer they register and apply.
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        role="DEVOTEE"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    seed_default_admin(db)

    user = (
        db.query(User)
        .filter(
            or_(
                User.email == login_data.login,
                User.username == login_data.login
            )
        )
        .first()
    )

    print("LOGIN:", login_data.login)
    print("USER:", user)

    if not user or not verify_password(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,
        "id": user.id
    }
# Swagger-compatible login for docs testing
@router.post("/token", response_model=Token, include_in_schema=False)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    seed_default_admin(db)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,        "id": user.id
    }

@router.post("/google", response_model=Token)
def google_login(google_data: dict, db: Session = Depends(get_db)):
    seed_default_admin(db)
    email = google_data.get("email")
    name = google_data.get("name", "Google User")
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid Google payload")
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create user
        hashed_password = get_password_hash("google-auth-placeholder-password")
        user = User(
            email=email,
            full_name=name,
            role="DEVOTEE",
            hashed_password=hashed_password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,
        "id": user.id
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
   
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email not found"
        )

    otp = str(random.randint(100000, 999999))

    user.reset_otp = otp
    user.otp_verified = False
    user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)

    db.commit()
    db.refresh(user)
    # Temporary: Print OTP in terminal
   
    send_otp_email(user.email, user.reset_otp)
   

    return {
        "message": "OTP generated successfully"
    }
@router.post("/verify-otp")
def verify_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    print("DB OTP:", user.reset_otp)
    print("USER OTP:", request.otp)
    print("MATCH:", user.reset_otp == request.otp)
    print("================================")
    print("DB OTP      :", user.reset_otp)
    print("USER OTP    :", request.otp)
    print("DB OTP TYPE :", type(user.reset_otp))
    print("USER TYPE   :", type(request.otp))
    print("MATCH       :", user.reset_otp == request.otp)
    print("================================")
    if user.reset_otp != request.otp:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if datetime.datetime.utcnow() > user.otp_expiry:
        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )

    user.otp_verified = True
    db.commit()

    return {
        "message": "OTP verified successfully"
    }
@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if not user.otp_verified:
        raise HTTPException(
            status_code=400,
            detail="OTP not verified"
        )

    user.hashed_password = get_password_hash(request.new_password)

    user.reset_otp = None
    user.otp_expiry = None
    user.otp_verified = False

    db.commit()

    return {
        "message": "Password reset successful"
    }

@router.put("/change-password")
def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check old password
    if not verify_password(
        password_data.old_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Old password is incorrect"
        )

    # Update new password
    current_user.hashed_password = get_password_hash(
        password_data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }
@router.put("/me", response_model=UserResponse)
def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check if another user already uses this email
    existing = (
        db.query(User)
        .filter(
            User.email == user_data.email,
            User.id != current_user.id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    current_user.full_name = user_data.full_name
    current_user.email = user_data.email

    db.commit()
    db.refresh(current_user)

    return current_user