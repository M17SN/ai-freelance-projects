import logging
import chromadb

logger = logging.getLogger(__name__)

# Connect to the same ChromaDB instance created by seed_jobs.py
client     = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection(
    name     = "job_descriptions",
    metadata = {"hnsw:space": "cosine"}
)


def search_jobs(cv_vector: list[float], top_k: int = 5) -> list[dict]:
    """
    RAG Step — search ChromaDB for the most relevant job descriptions
    using the CV's vector embedding.

    Args:
        cv_vector: the embedding vector from embedder.py
        top_k:     number of matching jobs to return

    Returns:
        list of matching job metadata dicts
    """
    try:
        results = collection.query(
            query_embeddings = [cv_vector],
            n_results        = top_k,
            include          = ["metadatas", "distances"]
        )

        # Extract metadata from results
        jobs = []
        metadatas = results["metadatas"][0]
        distances = results["distances"][0]

        for metadata, distance in zip(metadatas, distances):
            # Convert cosine distance to similarity score (0-100)
            similarity = round((1 - distance) * 100, 1)
            jobs.append({
                "title":      metadata["title"],
                "company":    metadata["company"],
                "skills":     metadata["skills"],
                "similarity": similarity
            })

        logger.info(f"Found {len(jobs)} matching jobs from ChromaDB")
        return jobs

    except Exception as e:
        logger.error(f"ChromaDB search failed: {e}")
        return []