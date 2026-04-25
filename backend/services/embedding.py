"""
Verse search service using TF-IDF keyword matching.
Pure Python + numpy — no sentence-transformers or PyTorch needed.
Claude handles the intelligent synthesis; this just retrieves candidates.
"""
import json
import re
import math
import numpy as np
from pathlib import Path
from typing import Optional

_verses_data: list[dict] = []
_tfidf_matrix: Optional[np.ndarray] = None
_vocab: dict[str, int] = {}

VERSES_PATH = Path(__file__).parent.parent / "data" / "verses.json"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z]+", text.lower())


def _load_verses():
    global _verses_data
    if not _verses_data:
        with open(VERSES_PATH) as f:
            _verses_data = json.load(f)
    return _verses_data


def _build_index():
    global _tfidf_matrix, _vocab
    if _tfidf_matrix is not None:
        return

    verses = _load_verses()

    # Build corpus: translation + word_meanings for each verse
    corpus = []
    for v in verses:
        text = f"{v.get('translation_en', '')} {v.get('word_meanings', '')}"
        corpus.append(_tokenize(text))

    # Build vocabulary
    all_words = set(w for doc in corpus for w in doc)
    _vocab = {w: i for i, w in enumerate(sorted(all_words))}
    V = len(_vocab)
    N = len(corpus)

    # TF-IDF matrix (N x V)
    tf = np.zeros((N, V), dtype=np.float32)
    for i, doc in enumerate(corpus):
        for w in doc:
            tf[i, _vocab[w]] += 1
        if len(doc):
            tf[i] /= len(doc)

    # IDF
    df = (tf > 0).sum(axis=0)
    idf = np.log((N + 1) / (df + 1)) + 1

    _tfidf_matrix = tf * idf
    # L2-normalise rows
    norms = np.linalg.norm(_tfidf_matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    _tfidf_matrix /= norms

    print(f"Built TF-IDF index: {N} verses, {V} terms")


def generate_embeddings(force: bool = False):
    """Build in-memory search index (called at startup)."""
    _build_index()


def search_verses(query: str, top_k: int = 10) -> list[dict]:
    """Keyword search over verses. Returns top_k verse IDs with scores."""
    _build_index()
    verses = _load_verses()

    tokens = _tokenize(query)
    if not tokens:
        return []

    V = len(_vocab)
    qvec = np.zeros(V, dtype=np.float32)
    for w in tokens:
        if w in _vocab:
            qvec[_vocab[w]] += 1
    norm = np.linalg.norm(qvec)
    if norm == 0:
        # No known words — return top verses by chapter 2 (most universally relevant)
        return [{"verse_id": v["id"], "similarity": 0.5}
                for v in verses if v.get("chapter") == 2][:top_k]
    qvec /= norm

    similarities = _tfidf_matrix @ qvec
    top_indices = np.argsort(similarities)[::-1][:top_k]

    return [
        {"verse_id": verses[i]["id"], "similarity": float(similarities[i])}
        for i in top_indices
    ]


def get_verse_by_id(verse_id: str) -> Optional[dict]:
    verses = _load_verses()
    for v in verses:
        if v["id"] == verse_id:
            return v
    return None


def get_verses_by_chapter(chapter: int) -> list[dict]:
    verses = _load_verses()
    return [v for v in verses if v["chapter"] == chapter]
