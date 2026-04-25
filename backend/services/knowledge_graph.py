"""
In-memory knowledge graph for verse-problem-emotion-life_stage matching.
Replaces Neo4j for MVP — all data fits in memory.
"""
import json
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data"

_problems: list[dict] = []
_emotions: list[dict] = []
_life_stages: list[dict] = []


def _load_data():
    global _problems, _emotions, _life_stages
    if not _problems:
        with open(DATA_DIR / "problems.json") as f:
            _problems = json.load(f)
        with open(DATA_DIR / "emotions.json") as f:
            _emotions = json.load(f)
        with open(DATA_DIR / "life_stages.json") as f:
            _life_stages = json.load(f)


def get_problems() -> list[dict]:
    _load_data()
    return _problems


def get_emotions() -> list[dict]:
    _load_data()
    return _emotions


def get_life_stages() -> list[dict]:
    _load_data()
    return _life_stages


def get_life_stage_for_age(age: int) -> Optional[dict]:
    """Find the life stage that matches a given age."""
    _load_data()
    for stage in _life_stages:
        if stage["age_lower"] <= age <= stage["age_upper"]:
            return stage
    return _life_stages[-1]  # Default to elder


def match_problems(query: str) -> list[dict]:
    """Simple keyword matching for problems. Used alongside vector search."""
    _load_data()
    query_lower = query.lower()
    scored = []
    for p in _problems:
        score = 0
        for kw in p.get("keywords", []):
            if kw.lower() in query_lower:
                score += 1
        if score > 0:
            scored.append({**p, "_keyword_score": score})
    scored.sort(key=lambda x: x["_keyword_score"], reverse=True)
    return scored[:5]


def match_emotions(query: str) -> list[dict]:
    """Simple keyword matching for emotional states."""
    _load_data()
    query_lower = query.lower()
    matched = []
    emotion_keywords = {
        "FEAR": ["scared", "afraid", "terrified", "fear", "dread", "phobia"],
        "ANGER": ["angry", "furious", "rage", "mad", "frustrated", "irritated", "snap", "temper"],
        "SADNESS": ["sad", "unhappy", "depressed", "miserable", "crying", "tears"],
        "CONFUSION": ["confused", "lost", "don't know", "uncertain", "torn", "dilemma"],
        "ANXIETY": ["anxious", "worried", "nervous", "panic", "stress", "restless", "can't sleep"],
        "GUILT": ["guilty", "blame myself", "my fault", "shouldn't have", "regret"],
        "SHAME": ["ashamed", "embarrassed", "humiliated", "disgrace"],
        "JEALOUSY": ["jealous", "envious", "why them", "unfair", "they have"],
        "GRIEF": ["grief", "mourning", "loss", "died", "death", "passed away", "gone"],
        "LONELINESS": ["lonely", "alone", "isolated", "no one", "nobody cares"],
        "HOPELESSNESS": ["hopeless", "no point", "give up", "nothing works", "despair", "can't go on"],
        "SELF_DOUBT": ["not good enough", "impostor", "can't do it", "doubt myself", "inadequate", "worthless"],
        "OVERWHELM": ["overwhelmed", "too much", "drowning", "can't handle", "everything at once"],
    }
    for emotion_id, keywords in emotion_keywords.items():
        for kw in keywords:
            if kw in query_lower:
                for e in _emotions:
                    if e["id"] == emotion_id:
                        matched.append(e)
                        break
                break
    return matched


def get_problem_by_id(problem_id: str) -> Optional[dict]:
    _load_data()
    for p in _problems:
        if p["id"] == problem_id:
            return p
    return None


def get_emotion_by_id(emotion_id: str) -> Optional[dict]:
    _load_data()
    for e in _emotions:
        if e["id"] == emotion_id:
            return e
    return None
