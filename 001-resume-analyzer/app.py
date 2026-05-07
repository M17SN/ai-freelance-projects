import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from extractor import extract_text
from embedder import embed_text
from retriever import search_jobs
from analyzer import analyze_cv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app  = Flask(__name__)
CORS(app)  # Allow React frontend to call this API

PORT = int(os.environ.get("PORT", 5000))


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "resume-analyzer"}), 200


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Main endpoint — receives a PDF file, runs the full pipeline,
    and returns skills, job recommendations, and summary.
    """
    # ── Step 1: Validate file upload ──
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    logger.info(f"Received file: {file.filename}")

    # ── Step 2: Extract text from PDF ──
    try:
        cv_bytes = file.read()
        cv_text  = extract_text(cv_bytes)
        logger.info(f"Extracted {len(cv_text)} characters from PDF")
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        return jsonify({"error": "Failed to extract text from PDF"}), 500

    # ── Step 3: Embed CV text ──
    try:
        cv_vector = embed_text(cv_text)
        logger.info("Generated embedding vector")
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return jsonify({"error": "Failed to embed CV text"}), 500

    # ── Step 4: RAG — search ChromaDB for matching jobs ──
    try:
        matching_jobs = search_jobs(cv_vector)
        logger.info(f"Found {len(matching_jobs)} matching jobs")
    except Exception as e:
        logger.error(f"Job search failed: {e}")
        matching_jobs = []

    # ── Step 5: Analyze with LLM ──
    try:
        results = analyze_cv(cv_text, matching_jobs)
        logger.info("LLM analysis complete")
    except Exception as e:
        logger.error(f"LLM analysis failed: {e}")
        return jsonify({"error": "Failed to analyze CV"}), 500

    # ── Step 6: Return results ──
    return jsonify({
        "skills":              results.get("skills", []),
        "job_recommendations": results.get("job_recommendations", []),
        "summary":             results.get("summary", ""),
        "matching_jobs":       matching_jobs
    }), 200


if __name__ == "__main__":
    logger.info(f"Resume Analyzer API starting on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)