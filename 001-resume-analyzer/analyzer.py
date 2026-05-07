import os
import json
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Groq client with API key from .env
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"


def analyze_cv(cv_text: str, matching_jobs: list[dict]) -> dict:
    """
    Send CV text + matching job descriptions to LLaMA via Groq.
    Returns extracted skills, job recommendations, and a summary.

    Args:
        cv_text:       raw text of the CV from extractor.py
        matching_jobs: relevant jobs retrieved by retriever.py (RAG)

    Returns:
        dict with skills, job_recommendations, and summary
    """
    # Format matching jobs for the prompt
    jobs_context = ""
    if matching_jobs:
        jobs_context = "\n\nRelevant job descriptions from our database:\n"
        for i, job in enumerate(matching_jobs, 1):
            jobs_context += f"\n{i}. {job.get('title', 'Unknown')} at {job.get('company', 'Unknown')}\n"
            jobs_context += f"   Required skills: {job.get('skills', '')}\n"
            jobs_context += f"   Match score: {job.get('similarity', 0)}%\n"

    prompt = f"""You are an expert career advisor and CV analyzer.

Analyze the following CV and provide:
1. A list of technical and soft skills found in the CV
2. Top 5 job role recommendations based on the CV and the matching jobs provided
3. A brief professional summary of the candidate (3-4 sentences)

{jobs_context}

CV Content:
{cv_text[:6000]}

Respond ONLY in this exact JSON format with no extra text:
{{
    "skills": ["skill1", "skill2", "skill3"],
    "job_recommendations": [
        {{
            "title": "Job Title",
            "match_percentage": 90,
            "reason": "Why this job fits the candidate"
        }}
    ],
    "summary": "Brief professional summary of the candidate"
}}"""

    try:
        response = client.chat.completions.create(
            model    = MODEL,
            messages = [{"role": "user", "content": prompt}],
            temperature      = 0.3,
            max_tokens       = 1500,
            response_format  = {"type": "json_object"}
        )

        raw_text = response.choices[0].message.content
        results  = json.loads(raw_text)

        logger.info("LLM analysis completed successfully")
        return results

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        return {
            "skills":              ["Could not extract skills"],
            "job_recommendations": [],
            "summary":             "Analysis could not be completed"
        }
    except Exception as e:
        logger.error(f"Groq LLM call failed: {e}")
        raise