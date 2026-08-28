from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)

from backend.config import settings


client = Brevo(api_key=settings.BREVO_API_KEY)


def send_otp_email(to_email: str, otp: str):
    result = client.transactional_emails.send_transac_email(
        subject="Password Reset OTP",
        html_content=f"""
        <html>
        <body>
            <h2>Sri Vinayaka Navarathri Mahotsavam</h2>
            <p>Your OTP is:</p>
            <h1>{otp}</h1>
            <p>This OTP is valid for 5 minutes.</p>
        </body>
        </html>
        """,
        sender=SendTransacEmailRequestSender(
            name="Sri Vinayaka Mahotsavam",
            email="pchaitanya1573@gmail.com",
        ),
        to=[
            SendTransacEmailRequestToItem(
                email=to_email,
                name="User",
            )
        ],
    )

    print("Email sent:", result.message_id)