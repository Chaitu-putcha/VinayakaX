import os
import smtplib
from dotenv import load_dotenv

load_dotenv("backend/.env")

print("SERVER :", os.getenv("BREVO_SMTP_SERVER"))
print("PORT   :", os.getenv("BREVO_SMTP_PORT"))
print("LOGIN  :", os.getenv("BREVO_SMTP_LOGIN"))
print("KEY OK :", bool(os.getenv("BREVO_SMTP_KEY")))

server = smtplib.SMTP(
    os.getenv("BREVO_SMTP_SERVER"),
    int(os.getenv("BREVO_SMTP_PORT"))
)

server.ehlo()
server.starttls()
server.ehlo()

server.login(
    os.getenv("BREVO_SMTP_LOGIN"),
    os.getenv("BREVO_SMTP_KEY")
)

print("LOGIN SUCCESS")
server.quit()