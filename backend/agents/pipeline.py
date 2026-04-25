"""
Multi-Agent Pipeline — Orchestrates the full flow from user query to Gita guidance.

Flow: Safety → Router → Verse Finder → Persona + Psychologist + Commentary → Synthesis
"""
import json
from typing import Optional
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, LLM_MODEL, MAX_TOKENS
from agents.safety import assess_risk, CRISIS_RESOURCES
from services.embedding import search_verses, get_verse_by_id
from services.knowledge_graph import (
    match_problems, match_emotions, get_life_stage_for_age,
    get_problems, get_emotions
)

client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your-anthropic-api-key-here" else None


def _call_llm(system: str, user_msg: str, max_tokens: int = MAX_TOKENS) -> str:
    """Call Claude API. Falls back to a template if no API key."""
    if not client:
        return _fallback_response(user_msg)

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
        return _fallback_response(user_msg)


def _fallback_response(query: str) -> str:
    """Fallback when no API key — return structured template."""
    return json.dumps({
        "problems": ["CAREER_CONFUSION"],
        "emotions": ["CONFUSION", "ANXIETY"],
        "risk_level": "none",
        "summary": query[:200]
    })


# ─── ROUTER AGENT ───

ROUTER_SYSTEM = """You are the Router Agent for GitaAI, a Bhagavad Gita guidance platform.

Your job: Analyze the user's message and classify it into structured signals.

Return ONLY valid JSON (no markdown, no explanation):
{
  "problems": ["PROBLEM_ID_1", "PROBLEM_ID_2"],
  "emotions": ["EMOTION_ID_1", "EMOTION_ID_2"],
  "risk_level": "none|low|moderate|high|immediate",
  "summary": "1-sentence summary of user's core concern",
  "language_detected": "en|hi|hinglish",
  "emotional_intensity": 0.0 to 1.0
}

Available problem IDs: CAREER_FORCED_STREAM, CAREER_CONFUSION, CAREER_SWITCH_FEAR, CAREER_JOB_LOSS, CAREER_BURNOUT, CAREER_IMPOSTOR, REL_LOVE_MARRIAGE_OPPOSITION, REL_BREAKUP_GRIEF, REL_MARITAL_CONFLICT, REL_PARENT_EXPECTATIONS, REL_IN_LAW_CONFLICT, REL_LONELINESS, HEALTH_DEATH_LOVED_ONE, HEALTH_CHRONIC_ILLNESS, HEALTH_DEATH_ANXIETY, IDENTITY_EXISTENTIAL_CRISIS, IDENTITY_QUARTER_LIFE, IDENTITY_MIDLIFE_CRISIS, EDUCATION_EXAM_ANXIETY, EDUCATION_ACADEMIC_FAILURE, FINANCIAL_DEBT, FINANCIAL_SOLE_EARNER, ADDICTION_PHONE, MORAL_DUTY_VS_DESIRE, MORAL_KARMA_THEODICY, MORAL_FORGIVENESS, SOCIAL_LOG_KYA_KAHENGE, EMOTIONAL_ANGER, EMOTIONAL_SELF_DOUBT

Available emotion IDs: FEAR, ANGER, SADNESS, CONFUSION, JOY, PEACE, ANXIETY, GUILT, SHAME, JEALOUSY, GRIEF, LONELINESS, RESENTMENT, HOPELESSNESS, SELF_DOUBT, OVERWHELM, GRATITUDE, DETERMINATION

Pick the most relevant 1-3 problems and 1-3 emotions. Be precise."""


def route(query: str) -> dict:
    """Router agent: classify the user's problem and emotional state."""
    # First, use keyword matching as baseline
    kw_problems = match_problems(query)
    kw_emotions = match_emotions(query)

    if client:
        try:
            result = _call_llm(ROUTER_SYSTEM, query, max_tokens=500)
            return json.loads(result)
        except (json.JSONDecodeError, Exception):
            pass

    # Fallback to keyword matching
    return {
        "problems": [p["id"] for p in kw_problems[:3]],
        "emotions": [e["id"] for e in kw_emotions[:3]] or ["CONFUSION"],
        "risk_level": "none",
        "summary": query[:200],
        "language_detected": "en",
        "emotional_intensity": 0.5,
    }


# ─── SYNTHESIS AGENT ───

SYNTHESIS_SYSTEM = """You are a wise, warm friend who deeply knows the Bhagavad Gita. You're not a chatbot. You don't follow templates. You respond the way a genuinely perceptive person would — sometimes with a direct answer, sometimes with a question, sometimes with a verse that just fits.

You receive the user's message, their age and life stage, and the most semantically relevant Gita verses.

## How to respond:

**Match the response to what the person actually needs:**
- A philosophical question deserves a thoughtful philosophical answer
- Emotional pain deserves empathy first, wisdom second
- A practical dilemma deserves a grounded, specific take
- A short question can get a short answer — don't pad it

**Always ground your response in one specific verse:**
- Show it briefly: transliteration in italics, then the translation in plain language
- Reference it as **Chapter X, Verse Y**
- Then speak directly to the person — what does THIS verse mean for THEIR specific situation?

**Tone rules:**
- You are a wise friend, not a guru or a textbook
- For students / young adults: casual, direct, maybe a bit Hinglish if they wrote in it
- For older users: warm, respectful, grounded
- NEVER preachy. NEVER generic ("everything happens for a reason" is banned)
- If they wrote in Hindi or Hinglish, respond in Hinglish

**Length:**
- 150–350 words is usually right
- Longer only when the situation genuinely calls for depth
- End with either one concrete thing they can do, or a question that makes them think

**Do NOT:**
- Use rigid section headers every time (### What This Means For You, etc.)
- Force a 5-part structure onto every response
- Copy-paste translations without connecting them to the person's situation
- Give the same format to a grief question and a career question
"""


def synthesize(
    query: str,
    user_profile: dict,
    routed: dict,
    top_verses: list[dict],
    life_stage: dict,
) -> str:
    """Synthesis agent: combine all signals into the final response."""
    # Build context for the LLM
    verse_context = ""
    for i, v in enumerate(top_verses[:3]):
        verse_data = get_verse_by_id(v["verse_id"])
        if not verse_data:
            continue
        verse_context += f"\n--- Verse {i+1}: {v['verse_id']} (similarity: {v['similarity']:.2f}) ---\n"
        verse_context += f"Sanskrit: {verse_data.get('sanskrit', 'N/A')}\n"
        verse_context += f"Transliteration: {verse_data.get('transliteration', 'N/A')}\n"
        verse_context += f"Translation: {verse_data.get('translation_en', 'N/A')}\n"
        verse_context += f"Word meanings: {verse_data.get('word_meanings', 'N/A')[:300]}\n"
        # Include top 3 commentaries
        commentaries = verse_data.get("commentaries", {})
        for j, (commentator, text) in enumerate(commentaries.items()):
            if j >= 3:
                break
            verse_context += f"\n{commentator}: {str(text)[:400]}\n"

    user_context = f"""
USER PROFILE:
- Age: {user_profile.get('age', 'unknown')}
- Life Stage: {life_stage.get('name', 'unknown')} ({life_stage.get('description', '')})
- Preferred Language: {user_profile.get('preferred_language', 'en')}
- Preferred Tone: {life_stage.get('tone', 'Gentle and warm')}
- What to AVOID: {', '.join(life_stage.get('avoid', []))}
- Gita Familiarity: {user_profile.get('gita_familiarity', 'NEVER_READ')}

DETECTED SIGNALS:
- Problems: {', '.join(routed.get('problems', []))}
- Emotions: {', '.join(routed.get('emotions', []))}
- Emotional Intensity: {routed.get('emotional_intensity', 0.5)}
- Language: {routed.get('language_detected', 'en')}

TOP MATCHING VERSES:
{verse_context}

USER'S MESSAGE:
{query}
"""

    def _verse_fallback():
        best_verse = get_verse_by_id(top_verses[0]["verse_id"]) if top_verses else None
        if best_verse:
            return _template_response(best_verse, query, life_stage)
        return "I'm unable to generate a response right now. Please set up your Anthropic API key in the .env file."

    if not client:
        return _verse_fallback()

    try:
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYNTHESIS_SYSTEM,
            messages=[{"role": "user", "content": user_context}],
        )
        return response.content[0].text
    except Exception as e:
        print(f"Synthesis LLM call failed: {e}")
        return _verse_fallback()


def _template_response(verse: dict, query: str, life_stage: dict) -> str:
    """Template fallback when no LLM is available."""
    ch = verse["chapter"]
    vn = verse["verse"]
    return f"""### 🙏 Verse — Chapter {ch}, Verse {vn}

*{verse.get('transliteration', '')}*

**Translation:** {verse.get('translation_en', '')}

### 💡 What This Means For You

This verse from the Bhagavad Gita speaks directly to what you're going through. The Gita teaches us that our true strength comes not from external circumstances, but from the clarity within.

*(For a personalized interpretation, please add your Anthropic API key to the .env file.)*

### 🎯 One Thing You Can Do Today

Take 5 minutes, sit quietly, and read this verse aloud. Let the words settle. Then ask yourself: "What would I do if I weren't afraid?"

### 🔗 Explore Further
- **Chapter {ch}** has more wisdom on this theme
- Try asking me about a specific aspect of your situation for deeper guidance
"""


# ─── MAIN PIPELINE ───

def process_query(query: str, user_profile: dict) -> dict:
    """
    Main pipeline: Process a user query through all agents.
    Returns the final response with metadata.
    """
    # Step 1: Safety check (always first, always runs)
    safety = assess_risk(query)
    if safety["risk_level"] == "immediate":
        return {
            "response": safety["message"],
            "risk_level": "immediate",
            "verse_ids": [],
            "agent_trace": ["safety:HALT"],
        }

    # Step 2: Route — classify problem + emotion
    routed = route(query)

    # Override risk if router detects it
    if routed.get("risk_level") in ("high", "immediate"):
        safety_msg = CRISIS_RESOURCES + "\n\n---\n\n"
    elif safety["risk_level"] == "high":
        safety_msg = CRISIS_RESOURCES + "\n\n---\n\n"
    else:
        safety_msg = ""

    # Step 3: Find relevant verses (vector search)
    top_verses = search_verses(query, top_k=10)

    # Step 4: Get user's life stage
    age = user_profile.get("age", 30)
    life_stage = get_life_stage_for_age(age) or {}

    # Step 5: Synthesize final response
    response = synthesize(query, user_profile, routed, top_verses, life_stage)

    # Add safety prefix if needed
    if safety_msg:
        response = safety_msg + response

    # Add supportive framing for moderate risk
    if safety["risk_level"] == "moderate":
        response += "\n\n---\n*If you're going through a difficult time, please consider talking to a professional counselor. You deserve support.* 🙏"

    return {
        "response": response,
        "risk_level": safety["risk_level"],
        "verse_ids": [v["verse_id"] for v in top_verses[:3]],
        "detected_problems": routed.get("problems", []),
        "detected_emotions": routed.get("emotions", []),
        "agent_trace": ["safety", "router", "verse_finder", "synthesis"],
    }
