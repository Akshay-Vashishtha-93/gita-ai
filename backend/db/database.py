import aiosqlite
import json
from pathlib import Path
from config import DB_PATH

DB_PATH.parent.mkdir(parents=True, exist_ok=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    age INTEGER,
    gender TEXT,
    location TEXT,
    preferred_language TEXT DEFAULT 'en',
    life_stage_id TEXT,
    gita_familiarity TEXT DEFAULT 'NEVER_READ',
    preferred_depth TEXT DEFAULT 'ACCESSIBLE',
    preferred_tone TEXT DEFAULT 'GENTLE',
    spiritual_identity TEXT,
    growth_phase TEXT DEFAULT 'crisis_seeking',
    onboarding_complete INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    primary_problem_id TEXT,
    primary_emotion_id TEXT,
    risk_level TEXT DEFAULT 'none',
    session_summary TEXT,
    platform TEXT DEFAULT 'WEB',
    created_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    verse_ids TEXT,
    agent_name TEXT,
    confidence_score REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    message_id TEXT REFERENCES messages(id),
    verse_id TEXT,
    feedback_type TEXT NOT NULL CHECK(feedback_type IN ('resonated', 'helpful', 'not_helpful', 'wrong_verse')),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_verse ON feedback(verse_id);
"""


async def get_db():
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    db = await get_db()
    await db.executescript(SCHEMA)
    await db.commit()
    await db.close()
