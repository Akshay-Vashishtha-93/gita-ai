"""
GitaAI Backend — FastAPI Application
"""
import os
import uuid
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from db.database import init_db, get_db
from services.embedding import search_verses, get_verse_by_id, get_verses_by_chapter
from services.knowledge_graph import get_problems, get_emotions, get_life_stages, get_life_stage_for_age
from agents.pipeline import process_query, client as llm_client
from config import LLM_MODEL, MAX_TOKENS
from agents.safety import assess_risk


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB. TF-IDF index is built lazily on first search."""
    print("GitaAI starting up...")
    await init_db()
    print("Database initialized. Ready.")
    yield
    print("GitaAI shutting down...")


app = FastAPI(
    title="GitaAI",
    description="AI-powered Bhagavad Gita guidance platform",
    version="0.1.0",
    lifespan=lifespan,
)

_cors_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───

class UserCreate(BaseModel):
    display_name: Optional[str] = None
    age: int = Field(ge=10, le=100)
    gender: Optional[str] = None
    location: Optional[str] = None
    preferred_language: str = "en"
    gita_familiarity: str = "NEVER_READ"


class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    user_id: str
    session_id: Optional[str] = None


class FeedbackCreate(BaseModel):
    user_id: str
    message_id: Optional[str] = None
    verse_id: Optional[str] = None
    feedback_type: str  # resonated, helpful, not_helpful, wrong_verse
    comment: Optional[str] = None


# ─── Health ───

@app.get("/health")
async def health():
    return {"status": "ok", "service": "GitaAI", "version": "0.1.0"}


# ─── User Routes ───

@app.post("/api/users")
async def create_user(user: UserCreate):
    user_id = str(uuid.uuid4())
    life_stage = get_life_stage_for_age(user.age)

    db = await get_db()
    await db.execute(
        """INSERT INTO users (id, display_name, age, gender, location, preferred_language,
           life_stage_id, gita_familiarity, onboarding_complete)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
        (user_id, user.display_name, user.age, user.gender, user.location,
         user.preferred_language, life_stage["id"] if life_stage else None,
         user.gita_familiarity),
    )
    await db.commit()
    await db.close()

    return {
        "user_id": user_id,
        "life_stage": life_stage,
        "message": "Welcome to GitaAI 🙏",
    }


@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = await cursor.fetchone()
    await db.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)


# ─── Chat Routes ───

@app.post("/api/chat")
async def chat(msg: ChatMessage):
    # Get user profile
    db = await get_db()
    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (msg.user_id,))
    user_row = await cursor.fetchone()
    if not user_row:
        await db.close()
        raise HTTPException(status_code=404, detail="User not found. Please complete onboarding first.")
    user_profile = dict(user_row)

    # Create or reuse session
    session_id = msg.session_id or str(uuid.uuid4())
    if not msg.session_id:
        await db.execute(
            "INSERT INTO sessions (id, user_id) VALUES (?, ?)",
            (session_id, msg.user_id),
        )

    # Save user message
    user_msg_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)",
        (user_msg_id, session_id, msg.message),
    )

    # Process through agent pipeline
    result = process_query(msg.message, user_profile)

    # Save assistant response
    assistant_msg_id = str(uuid.uuid4())
    await db.execute(
        """INSERT INTO messages (id, session_id, role, content, verse_ids, agent_name, confidence_score)
           VALUES (?, ?, 'assistant', ?, ?, 'pipeline', ?)""",
        (assistant_msg_id, session_id, result["response"],
         json.dumps(result.get("verse_ids", [])),
         0.8),
    )

    # Update session
    await db.execute(
        "UPDATE sessions SET primary_problem_id = ?, risk_level = ? WHERE id = ?",
        (json.dumps(result.get("detected_problems", [])), result["risk_level"], session_id),
    )

    await db.commit()
    await db.close()

    return {
        "response": result["response"],
        "session_id": session_id,
        "message_id": assistant_msg_id,
        "verse_ids": result.get("verse_ids", []),
        "risk_level": result["risk_level"],
    }


# ─── Verse Routes ───

@app.get("/api/verses/{verse_id}")
async def get_verse(verse_id: str):
    verse = get_verse_by_id(verse_id)
    if not verse:
        raise HTTPException(status_code=404, detail="Verse not found")
    return verse


@app.get("/api/verses/search/{query}")
async def search(query: str, top_k: int = 5):
    results = search_verses(query, top_k=top_k)
    enriched = []
    for r in results:
        verse = get_verse_by_id(r["verse_id"])
        if verse:
            enriched.append({**r, "verse": verse})
    return enriched


# ─── Feedback Routes ───

@app.post("/api/feedback")
async def submit_feedback(fb: FeedbackCreate):
    fb_id = str(uuid.uuid4())
    db = await get_db()
    await db.execute(
        """INSERT INTO feedback (id, user_id, message_id, verse_id, feedback_type, comment)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (fb_id, fb.user_id, fb.message_id, fb.verse_id, fb.feedback_type, fb.comment),
    )
    await db.commit()
    await db.close()
    return {"feedback_id": fb_id, "status": "recorded"}


# ─── Reference Data Routes ───

@app.get("/api/reference/problems")
async def list_problems():
    return get_problems()


@app.get("/api/reference/emotions")
async def list_emotions():
    return get_emotions()


@app.get("/api/reference/life-stages")
async def list_life_stages():
    return get_life_stages()


# ─── Session History Routes ───

@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, role, content, verse_ids, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
        (session_id,),
    )
    rows = await cursor.fetchall()
    await db.close()
    return [dict(r) for r in rows]


@app.get("/api/users/{user_id}/sessions")
async def get_user_sessions(user_id: str, limit: int = 10):
    db = await get_db()
    cursor = await db.execute(
        """SELECT s.id, s.created_at, s.risk_level,
           (SELECT content FROM messages WHERE session_id = s.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
           FROM sessions s WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT ?""",
        (user_id, limit),
    )
    rows = await cursor.fetchall()
    await db.close()
    return [dict(r) for r in rows]


# ─── Learning Module Routes ───

# In-memory cache for generated interpretations
_interp_cache: dict = {}

CHAPTER_DESCRIPTIONS = {
    1: ("Arjuna Vishada Yoga", "The crisis of conscience — Arjuna sees his relatives and breaks down. The battle hasn't started but the inner war has."),
    2: ("Sankhya Yoga", "Krishna's core philosophy: the eternal soul, duty without attachment, and the foundation of all Gita wisdom."),
    3: ("Karma Yoga", "Act without craving results. Why action is unavoidable and how to do it right."),
    4: ("Jnana Karma Sanyasa Yoga", "The yoga of knowledge and renunciation. Krishna reveals he has taught this before and explains true wisdom."),
    5: ("Karma Sanyasa Yoga", "Renouncing action vs. doing it with detachment — Krishna reconciles the apparent contradiction."),
    6: ("Dhyana Yoga", "The yoga of meditation. How to still the restless mind and find the self within."),
    7: ("Jnana Vijnana Yoga", "Knowledge and realization — understanding Krishna's true nature and why people come to him."),
    8: ("Aksara Brahma Yoga", "The imperishable Brahman. What happens at death, and the path to liberation."),
    9: ("Raja Vidya Raja Guhya Yoga", "The royal knowledge and the royal secret — the most direct path to the divine."),
    10: ("Vibhuti Yoga", "Divine manifestations — Krishna describes how the divine pervades all of creation."),
    11: ("Vishwarupa Darshana Yoga", "Arjuna sees Krishna's cosmic, all-encompassing form — the universe as one being."),
    12: ("Bhakti Yoga", "The yoga of devotion — the most beloved chapter. What true love and surrender look like."),
    13: ("Kshetra Kshetrajna Vibhaga Yoga", "The field and its knower — understanding the body, mind, and the soul that observes them."),
    14: ("Gunatraya Vibhaga Yoga", "The three gunas — sattva, rajas, tamas. How these qualities bind us and how to transcend them."),
    15: ("Purushottama Yoga", "The Supreme Person — the cosmic tree, the eternal soul, and reaching the highest."),
    16: ("Daivasura Sampad Vibhaga Yoga", "Divine and demonic qualities — a clear-eyed look at what builds us up and what tears us down."),
    17: ("Shraddhatraya Vibhaga Yoga", "The three types of faith — how our inner nature shapes our choices in food, worship, and practice."),
    18: ("Moksha Sanyasa Yoga", "The final teaching — renunciation, liberation, and the summary of everything Krishna has said."),
}

LEARN_INTERPRET_SYSTEM = """You are a Bhagavad Gita scholar and life guide. Given a specific verse and a life stage, write a SHORT, vivid interpretation (120-180 words) showing exactly how this verse applies to someone at that stage.

Be specific. Use concrete situations that person would actually face. No generic philosophy.
Make it feel like "oh, this verse was written for me right now."

Format: 2-3 paragraphs, no headers, warm and direct tone."""


@app.get("/api/learn/chapters")
async def list_chapters():
    chapters = []
    for num, (name, desc) in CHAPTER_DESCRIPTIONS.items():
        chapters.append({"chapter": num, "name": name, "description": desc})
    return chapters


@app.get("/api/learn/chapters/{chapter}/verses")
async def get_chapter_verses(chapter: int):
    if chapter < 1 or chapter > 18:
        raise HTTPException(status_code=404, detail="Chapter not found")
    verses = get_verses_by_chapter(chapter)
    # Return minimal data for the list view
    return [
        {
            "id": v["id"],
            "chapter": v["chapter"],
            "verse": v["verse"],
            "transliteration": v.get("transliteration", ""),
            "translation_en": v.get("translation_en", ""),
            "translation_hi": v.get("translation_hi", ""),
        }
        for v in verses
    ]


@app.get("/api/learn/verses/{verse_id}/interpret")
async def interpret_verse(verse_id: str, life_stage: Optional[str] = None):
    verse = get_verse_by_id(verse_id)
    if not verse:
        raise HTTPException(status_code=404, detail="Verse not found")

    # Get life stage details
    stages = get_life_stages()
    stage = next((s for s in stages if s["id"] == life_stage), stages[2])  # default: Young Professional

    cache_key = f"{verse_id}:{stage['id']}"
    if cache_key in _interp_cache:
        return _interp_cache[cache_key]

    # Generate interpretation
    prompt = f"""Verse: Chapter {verse['chapter']}, Verse {verse['verse']}
Transliteration: {verse.get('transliteration', '')}
Translation: {verse.get('translation_en', '')}

Life Stage: {stage['name']} — {stage['description']} (ages {stage['age_lower']}-{stage['age_upper']})
India context: {', '.join(stage.get('india_pressures', [])[:3])}

Write the interpretation for this specific life stage."""

    result = {"verse": verse, "life_stage": stage, "interpretation": None}

    if llm_client:
        try:
            from anthropic import Anthropic
            response = llm_client.messages.create(
                model=LLM_MODEL,
                max_tokens=400,
                system=LEARN_INTERPRET_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            result["interpretation"] = response.content[0].text
        except Exception as e:
            print(f"Interpretation LLM failed: {e}")

    if not result["interpretation"]:
        result["interpretation"] = f"This verse from Chapter {verse['chapter']} speaks to the {stage['name']} stage with particular resonance. {verse.get('translation_en', '')}"

    _interp_cache[cache_key] = result
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
