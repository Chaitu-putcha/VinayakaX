"""
Run this directly to verify Gemini works, isolated from FastAPI/Next.js:

    cd backend
    python test_gemini_directly.py

It never prints GEMINI_API_KEY. If something fails, it prints the real
exception type/message/status so you can see the actual cause instead of
a generic chat bubble error.
"""
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv()  # loads backend/.env if run from the backend/ directory

from google import genai
from google.genai import types
from google.genai.errors import APIError

MODEL = "gemini-3.7-flash"

TEST_MESSAGES = [
    "Hello",
    "Tell me the Vinayaka story",
    "Vinayaka story cheppu",
    "వినాయకుడి కథ చెప్పు",
    "Uddanam Ramakrishna Puram ekkada undi?",
    "What events are happening?",
    "Who is the village goddess?",
]


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"[check] GEMINI_API_KEY present in environment: {bool(api_key)}")
    if not api_key:
        print("[FAIL] GEMINI_API_KEY is not set. Fix backend/.env and how it's loaded before anything else.")
        sys.exit(1)

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[FAIL] Could not construct genai.Client(): {type(e).__name__}: {e}")
        sys.exit(1)

    print(f"[check] google-genai client created OK. Testing model={MODEL}\n")

    any_failed = False
    for i, msg in enumerate(TEST_MESSAGES, start=1):
        print(f"--- Test {i}: {msg!r} ---")
        start = time.perf_counter()
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=msg,
                config=types.GenerateContentConfig(
                    system_instruction="You are a helpful festival assistant. Answer briefly.",
                    thinking_config=types.ThinkingConfig(thinking_level="low"),
                    max_output_tokens=2048,
                ),
            )
            elapsed = time.perf_counter() - start

            candidates = getattr(response, "candidates", None) or []
            finish_reason = getattr(candidates[0], "finish_reason", None) if candidates else None

            try:
                text = response.text
            except Exception as text_err:
                print(f"[WARN] response.text raised: {type(text_err).__name__}: {text_err}")
                text = None

            usage = getattr(response, "usage_metadata", None)
            thoughts_tokens = getattr(usage, "thoughts_token_count", None) if usage else None
            output_tokens = getattr(usage, "candidates_token_count", None) if usage else None

            print(f"    elapsed={elapsed:.2f}s  finish_reason={finish_reason}  "
                  f"thinking_tokens={thoughts_tokens}  output_tokens={output_tokens}")
            if text:
                preview = text.strip().replace("\n", " ")[:150]
                print(f"    reply: {preview}{'...' if len(text) > 150 else ''}")
            else:
                print("    [FAIL] No usable text in response.")
                any_failed = True

        except APIError as e:
            elapsed = time.perf_counter() - start
            status = getattr(e, "code", None) or getattr(e, "status_code", None)
            print(f"    [FAIL] APIError after {elapsed:.2f}s — status={status} message={getattr(e, 'message', str(e))}")
            any_failed = True
        except Exception as e:
            elapsed = time.perf_counter() - start
            print(f"    [FAIL] {type(e).__name__} after {elapsed:.2f}s: {e}")
            any_failed = True
        print()

    if any_failed:
        print("=== One or more tests FAILED. See [FAIL]/[WARN] lines above for the real cause. ===")
        sys.exit(1)
    else:
        print("=== All tests passed. Gemini + this SDK version + this model + this key all work. ===")


if __name__ == "__main__":
    main()