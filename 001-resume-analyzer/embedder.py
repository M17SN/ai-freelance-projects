import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Load the model once when the module is imported
# This avoids reloading it on every request
model = SentenceTransformer("all-MiniLM-L6-v2")


def embed_text(text: str) -> list[float]:
    """
    Convert text into a vector using sentence-transformers.
    This vector is used to search ChromaDB for matching jobs (RAG).

    Args:
        text: the CV text extracted by extractor.py

    Returns:
        a list of floats representing the text as a vector
    """
    try:
        # Truncate to avoid hitting model limits
        truncated = text[:8000]

        # Generate embedding — returns a numpy array
        embedding = model.encode(truncated)

        # Convert numpy array to plain Python list for ChromaDB
        embedding_list = embedding.tolist()

        logger.info(f"Generated embedding with {len(embedding_list)} dimensions")
        return embedding_list

    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise