import logging
import os

from fastapi import APIRouter
from pydantic import BaseModel

from google import genai
from google.genai import types
from google.genai.errors import APIError

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])
logger = logging.getLogger("vinayakax.chatbot")


class ChatMessage(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# REAL FESTIVAL FACTS
# ---------------------------------------------------------------------------
# Same data the original keyword-matching backend used. Nothing invented.
# Used purely as grounding context handed to Gemini.
# ---------------------------------------------------------------------------
KNOWLEDGE_BASE = {
    "goddess": "The village Goddess of Uddanam Ramakrishna Puram is Sri Ramachandeshuari Thalli (శ్రీ రామచండీశ్వరి తల్లి).",
    "location": "The festival is celebrated at PUTCHAVANI TOTALU STREET, Uddanam Ramakrishna Puram, Vajrapukotturu Mandal, Srikakulam District, Andhra Pradesh, India.",
    "committee": "Main Head: Venky Chotu. President: Yogesh. Vice Presidents & Committee: Sekhar, Karthik, Sanju, Mohith, Jagadeesh, Sentharao, Bhaskar Rao, and Chaitanya.",
    "contact": "You can contact the committee at +91 7993093251, WhatsApp +91 7993093251, or email pchaitanya6522@gmail.com.",
    "competitions": "We are organizing Dance, Singing, Rangoli, Drawing, Quiz, and Sports. Registration can be done under the Competitions tab.",
    "timings": "Daily Harathi is performed twice: morning at 8:00 AM and evening grand Harathi at 7:00 PM. Laddu auction will take place on Day 9 during Nimajjanam.",
    "parking": "Free parking is organized at the Entrance Ground of Putchavani Totalu Street. Volunteers will guide you.",
    "food": "Free Annaprasadam is served daily from 12:30 PM to 3:00 PM at the community dining hall.",
    "motto": "The festival motto is: \u201cUnity, Devotion, Culture & Service\u201d (\u0c10\u0c15\u0c4d\u0c2f\u0c24, \u0c2d\u0c15\u0c4d\u0c24\u0c3f, \u0c38\u0c02\u0c38\u0c4d\u0c15\u0c43\u0c24\u0c3f & \u0c38\u0c47\u0c35).",
}


def _build_knowledge_context() -> str:
    return "\n".join(f"- {key.capitalize()}: {value}" for key, value in KNOWLEDGE_BASE.items())


SYSTEM_INSTRUCTION = f"""You are the VinayakaX AI Assistant, the official chatbot for the
Sri Vinayaka Navarathri Mahotsavam celebrated at Uddanam Ramakrishna Puram,
Vajrapukotturu Mandal, Srikakulam District, Andhra Pradesh, India.

RULES YOU MUST FOLLOW:
1. Use ONLY the "FESTIVAL FACTS" listed below for concrete details such as
   dates, names, locations, phone numbers, timings, committee members, or
   event schedules. NEVER invent or guess facts that are not present there.
   If someone asks something factual that isn't in the FESTIVAL FACTS, say
   you don't have that specific detail yet and suggest they contact the
   committee (see the "contact" fact).
2. Reply in whatever language or style the user writes in: English, Telugu
   (in Telugu script), or Tanglish (Telugu written with English letters).
   Match their language naturally rather than always defaulting to English.
3. If the user asks for "the Vinayaka story" / "\u0c35\u0c3f\u0c28\u0c3e\u0c2f\u0c15\u0c41\u0c21\u0c3f \u0c15\u0c25" / "vinayaka
   kadha" / "vinayaka story cheppu", narrate the traditional story of how
   Lord Ganesha was created by Goddess Parvati and how he came to have an
   elephant head, in a warm devotional tone. This is general Hindu mythology,
   not a festival fact, so you may tell it from your own knowledge. Keep it
   respectful and to a readable length (roughly 150-220 words) for a mobile
   chat window. Answer directly — do not spend time deliberating.
4. For small talk (like "Hello") respond warmly and briefly introduce
   yourself as the VinayakaX AI Assistant for this festival.
5. If a question is completely unrelated to the festival or to
   Ganesha/Vinayaka devotional topics, politely explain that you focus on
   VinayakaX festival information and gently steer the conversation back.
6. Keep replies conversational, concise, and easy to read in a small chat
   bubble. Do not pad answers with unnecessary length.

FESTIVAL FACTS (grounding context — do not fabricate beyond this list):
{_build_knowledge_context()}
"""

GEMINI_MODEL = "gemini-3.7-flash"

_client: "genai.Client | None" = None
_client_init_attempted = False


def _get_client():
    """Lazily create a Gemini client from the server-side env var."""
    global _client, _client_init_attempted
    if _client is not None:
        return _client
    if _client_init_attempted:
        return None

    _client_init_attempted = True
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set — chatbot cannot reach Gemini.")
        return None

    try:
        _client = genai.Client(api_key=api_key)
    except Exception:
        logger.exception("Failed to initialize Gemini client")
        return None

    return _client


FALLBACK_UNAVAILABLE = (
    "Sorry, the AI assistant isn't available right now. "
    "Please contact the committee at +91 7993093251."
)
FALLBACK_ERROR = "Sorry, something went wrong while getting a response. Please try again in a moment."
FALLBACK_RATE_LIMIT = "I'm getting a lot of questions right now! Please try again in a few seconds."
FALLBACK_EMPTY = "Sorry, I couldn't come up with a response for that. Could you try rephrasing your question?"


def _extract_reply_text(response) -> str:
    """
    Safely pull the answer text out of a Gemini response.

    On Gemini 3.x, `response.text` can raise (rather than return None/"")
    when a candidate has no plain-text part — e.g. if the model was cut off
    mid-thought by max_output_tokens, or the only candidate was blocked.
    We check finish_reason first so we can log *why* it happened instead of
    masking it as a generic error.
    """
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        finish_reason = getattr(candidates[0], "finish_reason", None)
        if finish_reason is not None and str(finish_reason) not in ("STOP", "FinishReason.STOP"):
            logger.warning("Gemini candidate finished with reason=%s (not STOP)", finish_reason)

    try:
        text = response.text
    except Exception:
        logger.exception("response.text raised while parsing Gemini output")
        text = None

    return (text or "").strip()


@router.post("")
def chat_bot(chat_msg: ChatMessage):
    user_message = (chat_msg.message or "").strip()
    if not user_message:
        return {"reply": "Please type a message so I can help you! \u0c26\u0c2f\u0c1a\u0c47\u0c38\u0c3f \u0c2e\u0c40 \u0c2a\u0c4d\u0c30\u0c36\u0c4d\u0c28 \u0c1f\u0c48\u0c2a\u0c4d \u0c1a\u0c47\u0c2f\u0c02\u0c21\u0c3f."}

    logger.info("Chatbot request received (len=%d chars)", len(user_message))

    client = _get_client()
    if client is None:
        return {"reply": FALLBACK_UNAVAILABLE}

    try:
        logger.info("Gemini request started (model=%s)", GEMINI_MODEL)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                # Gemini 3.x: thinking tokens count against max_output_tokens,
                # so the budget must cover thinking + the actual answer.
                # "low" keeps this a snappy chatbot instead of a slow reasoner.
                thinking_config=types.ThinkingConfig(thinking_level="low"),
                max_output_tokens=2048,
            ),
        )
        logger.info("Gemini response received")

        reply_text = _extract_reply_text(response)
        if not reply_text:
            logger.warning("Gemini returned no usable text for input of length %d", len(user_message))
            return {"reply": FALLBACK_EMPTY}
        return {"reply": reply_text}

    except APIError as e:
        status = getattr(e, "code", None) or getattr(e, "status_code", None)
        # Never log e's full payload/headers — just status + message text.
        logger.error("Gemini API error (status=%s): %s", status, getattr(e, "message", str(e)))
        if status == 429:
            return {"reply": FALLBACK_RATE_LIMIT}
        if status in (401, 403):
            return {"reply": FALLBACK_UNAVAILABLE}
        return {"reply": FALLBACK_ERROR}

    except Exception:
        logger.exception("Unexpected error calling Gemini")
        return {"reply": FALLBACK_ERROR}