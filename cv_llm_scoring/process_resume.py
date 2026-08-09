import json
import os
import time
import requests
from pypdf import PdfReader
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# OpenRouter configuration
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# ":free" models are rate limited, so transient failures are expected
MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 2

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file using pypdf."""
    reader = PdfReader(pdf_path)
    resume_text = " ".join([page.extract_text() or "" for page in reader.pages])
    return resume_text


def call_model(doc_text):
    """Call OpenRouter API to parse resume text into structured JSON."""
    prompt = f"""You are an expert HR assistant specializing in parsing resume documents.
Your task is to accurately extract information from the provided resume text and format it into a JSON object.

Follow these instructions carefully:
1. Extract the information based on the schema provided.
2. If a piece of information is not found in the resume, set the corresponding field to null.
3. Be precise and do not invent information.
4. Always set "shortlisted" to false.
5. For "suggestions", categorize skills into:
   - "commonSkills": Widely used industry skills (e.g., Python, SQL, JavaScript)
   - "uniqueSkills": Specialized or niche skills (e.g., LangChain, Huggingface, specific frameworks)

Here is the resume text:
---
{doc_text}
---

Respond with ONLY a valid JSON object matching this structure:
{{
  "extractedData": {{
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "skills": ["string"],
    "cgpa": "string or null",
    "shortlisted": false,
    "education": [{{
      "level": "string or null",
      "institution": "string or null",
      "board": "string or null",
      "year": "string or null",
      "percentage": "string or null"
    }}],
    "workExperience": [{{
      "position": "string or null",
      "company": "string or null",
      "duration": "string or null",
      "description": "string or null"
    }}],
    "suggestions": {{
      "commonSkills": ["string"],
      "uniqueSkills": ["string"]
    }}
  }}
}}"""

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5001",
        "X-Title": "JobSniff Resume Parser"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"}
    }

    last_error = None
    for attempt in range(MAX_ATTEMPTS):
        response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)

        # Rate limits on :free models are common; back off and retry
        if response.status_code == 429:
            last_error = f"rate limited (HTTP 429) by OpenRouter for model {OPENROUTER_MODEL}"
            logger.warning("%s - attempt %d/%d", last_error, attempt + 1, MAX_ATTEMPTS)
            time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
            continue

        response.raise_for_status()
        result = response.json()

        # OpenRouter answers HTTP 200 with an error payload when the upstream
        # provider fails or a quota is hit, so raise_for_status() misses it.
        # Without this check it surfaces as an opaque KeyError: 'choices'.
        if "choices" not in result:
            error = result.get("error")
            detail = error.get("message") if isinstance(error, dict) else (error or result)
            last_error = f"OpenRouter returned no completion for {OPENROUTER_MODEL}: {detail}"
            logger.warning("%s - attempt %d/%d", last_error, attempt + 1, MAX_ATTEMPTS)
            time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
            continue

        choice = result["choices"][0]
        content = (choice["message"].get("content") or "").strip()

        if not content:
            last_error = (
                f"OpenRouter returned an empty completion "
                f"(finish_reason={choice.get('finish_reason')})"
            )
            logger.warning("%s - attempt %d/%d", last_error, attempt + 1, MAX_ATTEMPTS)
            time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
            continue

        # Some models wrap the JSON in a markdown fence despite response_format
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0]

        # Parse the JSON response
        parsed_json = json.loads(content)
        logger.info("Resume parsed successfully via OpenRouter")
        return parsed_json

    raise RuntimeError(f"Resume parsing failed after {MAX_ATTEMPTS} attempts: {last_error}")


def process_resume(pdf_path):
    """Main function: extract PDF text, call LLM, return the parsed dict.

    Returns a dict (NOT a JSON string) so app.py can jsonify() it exactly once.
    Returning a string here makes Flask double-encode the response, which the
    Node backend then cannot read.
    """
    doc_text = extract_text_from_pdf(pdf_path)
    parsed_json = call_model(doc_text)

    # This used to write every result to a fixed "parsed_resume.json" in the
    # working directory - a leftover from notebook debugging. Two concurrent
    # requests overwrote each other's output, and on a read-only filesystem it
    # raised and failed an otherwise successful parse. Log instead, and only
    # when explicitly asked for.
    if os.environ.get("DEBUG_DUMP_PARSED") == "1":
        logger.info("Parsed resume payload: %s", json.dumps(parsed_json))

    return parsed_json
