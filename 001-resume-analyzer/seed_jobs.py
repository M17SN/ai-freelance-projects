import chromadb
import logging
from embedder import embed_text
from jobs_data import JOBS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed():
    """
    Load all job descriptions into ChromaDB.
    Run this once before starting the app.
    """
    # Connect to local ChromaDB — stores data in ./chroma_db folder
    client     = chromadb.PersistentClient(path="./chroma_db")

    # Get or create the jobs collection
    collection = client.get_or_create_collection(
        name     = "job_descriptions",
        metadata = {"hnsw:space": "cosine"}
    )

    # Check if already seeded
    existing = collection.count()
    if existing > 0:
        logger.info(f"Collection already has {existing} jobs — skipping seed.")
        return

    logger.info(f"Seeding {len(JOBS)} jobs into ChromaDB...")

    # Process in batches of 10
    batch_size = 10
    for i in range(0, len(JOBS), batch_size):
        batch = JOBS[i:i + batch_size]

        ids        = [job["id"] for job in batch]
        documents  = [f"{job['title']} {job['skills']} {job['description']}" for job in batch]
        metadatas  = [{"title": job["title"], "company": job["company"], "skills": job["skills"]} for job in batch]
        embeddings = [embed_text(doc) for doc in documents]

        collection.add(
            ids        = ids,
            documents  = documents,
            metadatas  = metadatas,
            embeddings = embeddings
        )

        logger.info(f"Seeded jobs {i + 1} to {min(i + batch_size, len(JOBS))}")

    logger.info(f"Done — {collection.count()} jobs in ChromaDB")


if __name__ == "__main__":
    seed()