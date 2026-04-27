"""
Multi-Agent Pipeline — Orchestrates the full flow from user query to Gita guidance.

Flow: Safety → Query Classifier → Router → Verse Finder → Synthesis
"""
import json
from typing import Optional
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, LLM_MODEL, MAX_TOKENS
from agents.safety import assess_risk, CRISIS_RESOURCES
from services.embedding import search_verses, get_verse_by_id
from services.knowledge_graph import (
    match_problems, match_emotions, get_life_stage_for_age,
)

client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your-anthropic-api-key-here" else None


def _call_llm(system: str, user_msg: str, max_tokens: int = MAX_TOKENS) -> str:
    if not client:
        return "{}"
    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        return response.content[0].text
    except Exception as e:
        print(f"LLM call failed: {e}")
        return "{}"


# ─── QUERY CLASSIFIER ───

CLASSIFIER_SYSTEM = """Classify the user's message into one of these types. Return ONLY valid JSON.

{
  "query_type": "greeting|casual|verse_followup|life_problem|philosophical|feedback",
  "language": "en|hi|hinglish",
  "needs_verse": true|false,
  "brief_ok": true|false
}

Rules:
- "greeting": Hi, hello, namaste, how are you, thanks, ok etc
- "casual": general chit-chat, not a life problem
- "verse_followup": asking about a specific verse, chapter, shloka, or following up on previous Gita content
- "life_problem": sharing a personal struggle, dilemma, emotional pain — needs full Gita guidance
- "philosophical": asking about karma, dharma, moksha, concepts — needs thoughtful answer
- "feedback": giving feedback on a previous response

- needs_verse: true only for life_problem and philosophical
- brief_ok: true for greeting, casual, feedback, verse_followup
- language: detect from message. hinglish = mix of Hindi+English"""


def classify_query(query: str, history: list[dict]) -> dict:
    recent = history[-2:] if history else []
    context = "\n".join([f"{m['role']}: {m['content'][:100]}" for m in recent])
    msg = f"Recent context:\n{context}\n\nUser's new message: {query}" if context else query

    if not client:
        return {"query_type": "life_problem", "language": "en", "needs_verse": True, "brief_ok": False}

    try:
        result = _call_llm(CLASSIFIER_SYSTEM, msg, max_tokens=150)
        return json.loads(result)
    except Exception:
        return {"query_type": "life_problem", "language": "en", "needs_verse": True, "brief_ok": False}


# ─── ROUTER AGENT ───

ROUTER_SYSTEM = """You are the Router Agent for GitaAI. Analyze the user's message.

Return ONLY valid JSON:
{
  "problems": ["PROBLEM_ID"],
  "emotions": ["EMOTION_ID"],
  "risk_level": "none|low|moderate|high|immediate",
  "summary": "1-sentence core concern",
  "emotional_intensity": 0.0
}

Problem IDs: CAREER_FORCED_STREAM, CAREER_CONFUSION, CAREER_SWITCH_FEAR, CAREER_JOB_LOSS, CAREER_BURNOUT, CAREER_IMPOSTOR, REL_LOVE_MARRIAGE_OPPOSITION, REL_BREAKUP_GRIEF, REL_MARITAL_CONFLICT, REL_PARENT_EXPECTATIONS, REL_IN_LAW_CONFLICT, REL_LONELINESS, HEALTH_DEATH_LOVED_ONE, HEALTH_CHRONIC_ILLNESS, HEALTH_DEATH_ANXIETY, IDENTITY_EXISTENTIAL_CRISIS, IDENTITY_QUARTER_LIFE, IDENTITY_MIDLIFE_CRISIS, EDUCATION_EXAM_ANXIETY, EDUCATION_ACADEMIC_FAILURE, FINANCIAL_DEBT, FINANCIAL_SOLE_EARNER, ADDICTION_PHONE, MORAL_DUTY_VS_DESIRE, MORAL_KARMA_THEODICY, MORAL_FORGIVENESS, SOCIAL_LOG_KYA_KAHENGE, EMOTIONAL_ANGER, EMOTIONAL_SELF_DOUBT

Emotion IDs: FEAR, ANGER, SADNESS, CONFUSION, JOY, PEACE, ANXIETY, GUILT, SHAME, JEALOUSY, GRIEF, LONELINESS, RESENTMENT, HOPELESSNESS, SELF_DOUBT, OVERWHELM, GRATITUDE, DETERMINATION

Pick 1-3 most relevant each. Risk = immediate only for active suicidal/self-harm intent."""


def route(query: str) -> dict:
    kw_problems = match_problems(query)
    kw_emotions = match_emotions(query)

    if client:
        try:
            result = _call_llm(ROUTER_SYSTEM, query, max_tokens=300)
            return json.loads(result)
        except Exception:
            pass

    return {
        "problems": [p["id"] for p in kw_problems[:3]],
        "emotions": [e["id"] for e in kw_emotions[:3]] or ["CONFUSION"],
        "risk_level": "none",
        "summary": query[:200],
        "emotional_intensity": 0.5,
    }


# ─── SYNTHESIS AGENT ───

SYNTHESIS_SYSTEM = """You are GitaAI — a wise, warm friend who knows the Bhagavad Gita deeply.

You receive a classified query, the user's profile, relevant verses, and conversation history.

## Response rules by query type:

**greeting / casual**: Be warm, human. No verse needed. 1-3 sentences. If it's their first message, invite them to share what's on their mind. If they said "thanks", acknowledge it briefly.

**verse_followup**: Answer the specific question about the verse concisely. 3-6 sentences max. No need for a new verse unless it genuinely adds value.

**philosophical**: Engage with the concept thoughtfully. Use 1 verse to ground it. 150-250 words. End with a question that deepens their thinking.

**life_problem**: This is where you give your best. Structure your response as:

1. **One sentence that shows you actually understood their situation** (not generic)
2. **The verse** — formatted exactly like this:
   > *[transliteration]*
   > "**[translation in plain, modern language]**"
   > — Chapter [X], Verse [Y]
3. **What this verse means for THEM specifically** — be concrete, not philosophical. Name their actual situation.
4. **One practical thing OR one honest question** to close

Total: 180-300 words for life_problem.

## Language rules (CRITICAL):
- If language = "hinglish": respond in Hinglish (mix Hindi words naturally into English sentences). E.g. "Yaar, ye jo tum feel kar rahe ho..." — this makes it feel personal
- If language = "hi": respond mostly in Hindi with some English
- If language = "en": respond in English

## Tone rules:
- You are a wise FRIEND, not a guru or textbook
- NEVER preachy. NEVER generic platitudes
- For young users (18-30): can be casual, even use "yaar" in Hinglish
- For older users (40+): warm, respectful, grounded
- NEVER use rigid section headers like "### What This Means For You"

## What NOT to do:
- Don't say "Great question!" or any other hollow opener
- Don't start with "As per the Bhagavad Gita..."
- Don't mention that you're an AI
- Don't give the same format for every message"""


def synthesize(
    query: str,
    user_profile: dict,
    routed: dict,
    top_verses: list[dict],
    life_stage: dict,
    query_classification: dict,
    history: list[dict],
) -> str:
    query_type = query_classification.get("query_type", "life_problem")
    language = query_classification.get("language", user_profile.get("preferred_language", "en"))

    # Build verse context (only for life_problem and philosophical)
    verse_context = ""
    if query_classification.get("needs_verse", True):
        for i, v in enumerate(top_verses[:3]):
            verse_data = get_verse_by_id(v["verse_id"])
            if not verse_data:
                continue
            verse_context += f"\n--- Verse {i+1}: Ch.{verse_data.get('chapter')}, V.{verse_data.get('verse')} ---\n"
            verse_context += f"Sanskrit: {verse_data.get('sanskrit', '')}\n"
            verse_context += f"Transliteration: {verse_data.get('transliteration', '')}\n"
            verse_context += f"Translation (EN): {verse_data.get('translation_en', '')}\n"
            verse_context += f"Translation (HI): {verse_data.get('translation_hi', '')}\n"
            # Commentaries
            for j, (name, text) in enumerate(verse_data.get("commentaries", {}).items()):
                if j >= 2:
                    break
                verse_context += f"{name}: {str(text)[:300]}\n"

    # Build conversation context
    history_context = ""
    if history:
        recent = history[-4:]
        history_context = "\nCONVERSATION SO FAR:\n"
        for m in recent:
            history_context += f"{m['role'].upper()}: {m['content'][:200]}\n"

    user_context = f"""QUERY TYPE: {query_type}
RESPOND IN LANGUAGE: {language}

USER PROFILE:
- Age: {user_profile.get('age', 'unknown')}
- Life Stage: {life_stage.get('name', 'unknown')} — {life_stage.get('description', '')}
- Life Stage Ashrama: {life_stage.get('ashrama', '')}
- Key pressures they face: {', '.join(life_stage.get('india_pressures', [])[:4])}
- Primary concerns: {', '.join(life_stage.get('primary_concerns', [])[:4])}
- Resonant Gita concepts: {', '.join(life_stage.get('resonant_concepts', []))}
- Tone to use: {life_stage.get('tone', 'Warm and grounded')}
- Avoid: {', '.join(life_stage.get('avoid', []))}
- Gita familiarity: {user_profile.get('gita_familiarity', 'NEVER_READ')}

DETECTED SIGNALS:
- Core problem: {', '.join(routed.get('problems', ['unknown']))}
- Emotional state: {', '.join(routed.get('emotions', []))}
- Emotional intensity: {routed.get('emotional_intensity', 0.5)} (0=calm, 1=in crisis)
- Summary: {routed.get('summary', '')}
{history_context}
RELEVANT GITA VERSES:
{verse_context if verse_context else '(No verse needed for this query type)'}

USER'S MESSAGE:
{query}"""

    if not client:
        if top_verses:
            v = get_verse_by_id(top_verses[0]["verse_id"])
            if v:
                return f"> *{v.get('transliteration', '')}*\n> \"{v.get('translation_en', '')}\"\n> — Chapter {v.get('chapter')}, Verse {v.get('verse')}\n\nThis verse speaks to your situation. Please add your Anthropic API key to get a personalized response."
        return "Namaste. Please set up your Anthropic API key to receive guidance."

    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYNTHESIS_SYSTEM,
            messages=[{"role": "user", "content": user_context}],
        )
        return response.content[0].text
    except Exception as e:
        print(f"Synthesis failed: {e}")
        return "I'm having trouble connecting right now. Please try again in a moment."


# ─── MAIN PIPELINE ───

def process_query(query: str, user_profile: dict, history: list[dict] = None) -> dict:
    """
    Main pipeline: Process a user query through all agents.
    history: list of {role, content} dicts from this session
    """
    if history is None:
        history = []

    # Step 1: Safety (always first)
    safety = assess_risk(query)
    if safety["risk_level"] == "immediate":
        return {
            "response": safety["message"],
            "risk_level": "immediate",
            "verse_ids": [],
            "detected_problems": [],
        }

    # Step 2: Classify query type
    classification = classify_query(query, history)
    query_type = classification.get("query_type", "life_problem")

    # Step 3: Short-circuit for greetings/casual
    if query_type in ("greeting", "casual", "feedback"):
        response = synthesize(query, user_profile, {}, [], {}, classification, history)
        return {
            "response": response,
            "risk_level": "none",
            "verse_ids": [],
            "detected_problems": [],
            "query_type": query_type,
        }

    # Step 4: Route (classify problem + emotion) — only for real queries
    routed = route(query)

    # Safety prefix for high risk
    safety_prefix = ""
    if routed.get("risk_level") in ("high", "immediate") or safety["risk_level"] == "high":
        safety_prefix = CRISIS_RESOURCES + "\n\n---\n\n"

    # Step 5: Verse search (only when needed)
    top_verses = []
    if classification.get("needs_verse", True):
        # Enhance query with detected problems for better verse matching
        enhanced_query = query
        if routed.get("summary"):
            enhanced_query = f"{query} {routed['summary']}"
        top_verses = search_verses(enhanced_query, top_k=10)

    # Step 6: Life stage context
    age = user_profile.get("age", 30)
    life_stage = get_life_stage_for_age(age) or {}

    # Step 7: Synthesize
    response = synthesize(query, user_profile, routed, top_verses, life_stage, classification, history)

    if safety_prefix:
        response = safety_prefix + response

    if safety["risk_level"] == "moderate":
        response += "\n\n---\n*Agar tum kisi mushkil waqt se guzar rahe ho, please kisi professional se baat karo. You deserve support. 🙏*"

    return {
        "response": response,
        "risk_level": safety["risk_level"],
        "verse_ids": [v["verse_id"] for v in top_verses[:3]],
        "detected_problems": routed.get("problems", []),
        "detected_emotions": routed.get("emotions", []),
        "query_type": query_type,
    }
