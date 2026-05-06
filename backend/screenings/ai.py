import json
import os
import re
from decimal import Decimal

from openai import OpenAI

MOCK_RESPONSE = json.dumps({
    "candidate_name": "Candidate",
    "score": "8.5",
    "reasons": [
        "Strong technical skills matching job requirements.",
        "Relevant experience in the required domain.",
        "Good communication and problem-solving background."
    ]
})

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

PROMPT_TEMPLATE = """
You are an HR screening assistant. Evaluate candidate-job fit strictly from supplied text.
Return JSON only in this exact shape:
{"candidate_name":"string","score":"1-10 number","reasons":["reason 1","reason 2","reason 3"]}

Rules:
- Use both the job description and resume.
- Score must be 1 to 10 (decimals allowed).
- Reasons must be concise bullets focused on skills, experience, and role fit.
- Ignore protected attributes (name, gender, ethnicity, location) unless explicitly job-relevant.
""".strip()


def use_mock() -> bool:
    return os.getenv("USE_MOCK_AI", "false").lower() == "true"


def _key_looks_valid() -> bool:
    """Return True only if the key is present and not a placeholder."""
    key = os.getenv("OPENAI_API_KEY") or ""
    if not key:
        return False
    if key.strip().startswith("replace-") or "replace-with" in key:
        return False
    return True


def get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY") or ""
    return OpenAI(api_key=key)


def call_openai(messages: list, stream: bool = False):
    """Call OpenAI and return the completion, or raise on any failure."""
    return get_client().chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.2,
        stream=stream,
    )


def parse_score(raw_score: str) -> Decimal:
    text = (raw_score or "").strip().lower()
    number_match = re.search(r"(\d+(?:\.\d+)?)", text)
    if number_match:
        value = float(number_match.group(1))
        return Decimal(str(max(1, min(10, value)))).quantize(Decimal("0.01"))
    if text in NUMBER_WORDS:
        return Decimal(NUMBER_WORDS[text]).quantize(Decimal("0.01"))
    return Decimal("5.00")


def parse_ai_json(raw_text: str) -> dict:
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = {}
    reasons = parsed.get("reasons") if isinstance(parsed.get("reasons"), list) else []
    return {
        "candidate_name": (parsed.get("candidate_name") or "").strip(),
        "score": parse_score(str(parsed.get("score", ""))),
        "reasons": [str(reason).strip() for reason in reasons[:3] if str(reason).strip()],
    }
