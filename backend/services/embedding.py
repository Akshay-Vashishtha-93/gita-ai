"""
Embedding service for semantic verse search.
Uses sentence-transformers locally (no API key needed).
700 verses fit entirely in memory — numpy cosine similarity is fast enough.
"""
import json
import numpy as np
from pathlib import Path
from typing import Optional

_model = None
_verse_embeddings: Optional[np.ndarray] = None
_verse_ids: list[str] = []
_verse_texts: list[str] = []
_verses_data: list[dict] = []

EMBEDDINGS_CACHE = Path(__file__).parent.parent / "data" / "embeddings.npz"
VERSES_PATH = Path(__file__).parent.parent / "data" / "verses.json"


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dims, fast, good quality
    return _model


def _load_verses():
    global _verses_data
    if not _verses_data:
        with open(VERSES_PATH) as f:
            _verses_data = json.load(f)
    return _verses_data


def generate_embeddings(force: bool = False):
    """Generate and cache embeddings for all verses."""
    global _verse_embeddings, _verse_ids, _verse_texts

    if EMBEDDINGS_CACHE.exists() and not force:
        data = np.load(EMBEDDINGS_CACHE, allow_pickle=True)
        _verse_embeddings = data["embeddings"]
        _verse_ids = data["ids"].tolist()
        _verse_texts = data["texts"].tolist()
        print(f"Loaded {len(_verse_ids)} cached embeddings")
        return

    verses = _load_verses()
    model = _get_model()

    texts = []
    ids = []
    for v in verses:
        # Combine translation + summary for richer semantic representation
        text = f"{v.get('translation_en', '')} {v.get('word_meanings', '')}"
        texts.append(text)
        ids.append(v["id"])

    print(f"Generating embeddings for {len(texts)} verses...")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=64)

    _verse_embeddings = np.array(embeddings, dtype=np.float32)
    _verse_ids = ids
    _verse_texts = texts

    np.savez(EMBEDDINGS_CACHE, embeddings=_verse_embeddings, ids=np.array(ids), texts=np.array(texts))
    print(f"Saved embeddings to {EMBEDDINGS_CACHE}")


def search_verses(query: str, top_k: int = 10) -> list[dict]:
    """Semantic search over verse embeddings. Returns top_k verse IDs with scores."""
    global _verse_embeddings, _verse_ids

    if _verse_embeddings is None:
        generate_embeddings()

    model = _get_model()
    query_embedding = model.encode([query], show_progress_bar=False)[0]

    # Cosine similarity
    query_norm = query_embedding / np.linalg.norm(query_embedding)
    verse_norms = _verse_embeddings / np.linalg.norm(_verse_embeddings, axis=1, keepdims=True)
    similarities = verse_norms @ query_norm

    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        results.append({
            "verse_id": _verse_ids[idx],
            "similarity": float(similarities[idx]),
        })
    return results


def get_verse_by_id(verse_id: str) -> Optional[dict]:
    """Get full verse data by ID."""
    verses = _load_verses()
    for v in verses:
        if v["id"] == verse_id:
            return v
    return None


def get_verses_by_chapter(chapter: int) -> list[dict]:
    """Get all verses in a chapter."""
    verses = _load_verses()
    return [v for v in verses if v["chapter"] == chapter]
