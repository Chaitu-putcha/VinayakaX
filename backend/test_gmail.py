import smtplib
from dotenv import load_dotenv
import os

load_dotenv("backend/.env")

email = os.getenv("EMAIL_USER")
password = os.getenv("EMAIL_PASSWORD")

print(email)
print("Password Length:", len(password))
print(repr(password))

server = smtplib.SMTP("smtp.gmail.com", 587)
server.starttls()
server.login(email, password)

print("LOGIN SUCCESS")
server.quit()