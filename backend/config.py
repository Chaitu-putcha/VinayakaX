import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

print("Loading .env from:", ENV_FILE)

load_dotenv(dotenv_path=ENV_FILE, override=True)


class Settings:
    BREVO_SMTP_SERVER = os.getenv("BREVO_SMTP_SERVER", "")
    BREVO_SMTP_PORT = int(os.getenv("BREVO_SMTP_PORT", "587"))
    BREVO_SMTP_LOGIN = os.getenv("BREVO_SMTP_LOGIN", "")
    BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
    
    PROJECT_NAME = "UDDANAM RAMAKRISHNA PURAM - Sri Vinayaka Navarathri Mahotsavam 2026"

    SECRET_KEY = os.getenv("SECRET_KEY", "vinayakax-super-secret-key-2026-development-only")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./festival.db")

    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

    EMAIL_USER = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")


settings = Settings()
