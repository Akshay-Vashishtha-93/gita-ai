"""
Multi-Agent Pipeline — GitaAI guidance engine.

Flow:
  Safety → Classifier → Router → Verse Search
           → Depth Agent (understand + challenge)
           → Structured Synthesis (JSON output)
"""
import json
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, LLM_MODEL, MAX_TOKENS
from agents.safety import assess_risk, CRISIS_RESOURCES
from services.embedding import search_verses, get_verse_by_id
from services.knowledge_graph import match_problems, match_emotions, get_life_stage_for_age

client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your-anthropic-api-key-here" else None


def _llm(system: str, user_msg: str, max_tokens: int = 400) -> str:
    if not client:
        return "{}"
    try:
        r = client.messages.create(
            model=LLM_MODEL, max_tokens=max_tokens,
            system=system, messages=[{"role": "user", "content": user_msg}],
        )
        return r.content[0].text
    except Exception as e:
        print(f"LLM error: {e}")
        return "{}"


# ─── AGENT 1: CLASSIFIER ───

CLASSIFIER_SYSTEM = """Classify the user's message. Return ONLY valid JSON, no markdown.

{
  "query_type": "greeting|casual|verse_followup|life_problem|philosophical",
  "language": "en|hi|hinglish",
  "needs_verse": true|false,
  "is_brief": true|false
}

query_type rules:
- greeting: hi, hello, namaste, thanks, ok, good morning, how are you
- casual: small talk, not a life problem
- verse_followup: asking about a specific verse, chapter, shloka, or following up on Gita content
- life_problem: personal struggle, dilemma, emotional pain — needs full guidance
- philosophical: asking about karma, dharma, moksha, abstract Gita concepts

language rules (CRITICAL — detect very carefully):
- "hinglish": ANY message that mixes Hindi and English words, OR uses Hindi words written in Roman script (e.g. "mera", "kya", "yaar", "nahi", "kuch", "ho", "gaya", "hai", "main", "tum", "apna", "zyada", "bahut", "lagta", "chahiye", "samajh", "rishta", "karna")
- "hi": message written primarily in Devanagari script (हिंदी)
- "en": message written entirely in English with no Hindi words

Examples:
- "I am feeling bahut akela" → hinglish
- "mera career chhod dena chahiye kya" → hinglish
- "yaar kya karu main" → hinglish
- "I don't know what to do" → en
- "मुझे नहीं पता" → hi

needs_verse: true only for life_problem + philosophical
is_brief: true for greeting, casual, verse_followup"""


def classify(query: str, history: list[dict]) -> dict:
    context = "\n".join(f"{m['role']}: {m['content'][:120]}" for m in history[-2:])
    msg = f"Context:\n{context}\n\nNew message: {query}" if context else query
    try:
        return json.loads(_llm(CLASSIFIER_SYSTEM, msg, max_tokens=120))
    except Exception:
        return {"query_type": "life_problem", "language": "en", "needs_verse": True, "is_brief": False}


# ─── AGENT 2: ROUTER ───

ROUTER_SYSTEM = """You are the Router Agent. Analyze the user's message and output ONLY valid JSON.

{
  "problems": ["PROBLEM_ID"],
  "emotions": ["EMOTION_ID"],
  "risk_level": "none|low|moderate|high|immediate",
  "summary": "1-sentence core concern",
  "emotional_intensity": 0.0
}

Problem IDs: CAREER_FORCED_STREAM, CAREER_CONFUSION, CAREER_SWITCH_FEAR, CAREER_JOB_LOSS, CAREER_BURNOUT, CAREER_IMPOSTOR, REL_LOVE_MARRIAGE_OPPOSITION, REL_BREAKUP_GRIEF, REL_MARITAL_CONFLICT, REL_PARENT_EXPECTATIONS, REL_IN_LAW_CONFLICT, REL_LONELINESS, HEALTH_DEATH_LOVED_ONE, HEALTH_CHRONIC_ILLNESS, HEALTH_DEATH_ANXIETY, IDENTITY_EXISTENTIAL_CRISIS, IDENTITY_QUARTER_LIFE, IDENTITY_MIDLIFE_CRISIS, EDUCATION_EXAM_ANXIETY, EDUCATION_ACADEMIC_FAILURE, FINANCIAL_DEBT, FINANCIAL_SOLE_EARNER, MORAL_DUTY_VS_DESIRE, MORAL_KARMA_THEODICY, MORAL_FORGIVENESS, SOCIAL_LOG_KYA_KAHENGE, EMOTIONAL_ANGER, EMOTIONAL_SELF_DOUBT

Emotion IDs: FEAR, ANGER, SADNESS, CONFUSION, ANXIETY, GUILT, SHAME, GRIEF, LONELINESS, RESENTMENT, HOPELESSNESS, SELF_DOUBT, OVERWHELM, GRATITUDE, DETERMINATION"""


def route(query: str) -> dict:
    kw_p = match_problems(query)
    kw_e = match_emotions(query)
    try:
        r = json.loads(_llm(ROUTER_SYSTEM, query, max_tokens=250))
        return r
    except Exception:
        return {
            "problems": [p["id"] for p in kw_p[:2]],
            "emotions": [e["id"] for e in kw_e[:2]] or ["CONFUSION"],
            "risk_level": "none", "summary": query[:150], "emotional_intensity": 0.5,
        }


# ─── AGENT 3: DEPTH ANALYST ───
# Debates with itself: what is the person REALLY going through? Is the top verse right?

DEPTH_SYSTEM = """You are GitaAI's Depth Analyst. You think critically before any response is given.

Given a user's message, their life context, and 3 candidate Gita verses, do a quick internal analysis.

Return ONLY valid JSON:
{
  "real_struggle": "What this person is REALLY going through, beneath the surface (1 sentence)",
  "what_they_need": "What kind of response would actually help them right now (1 sentence)",
  "best_verse_id": "ID of the verse that fits BEST (e.g. '2-47')",
  "why_best": "Why this verse over the others (1 sentence)",
  "wrong_approach": "What would be the WRONG thing to say to this person (1 sentence)",
  "tone": "warm_friend|wise_elder|gentle_guide|direct_peer"
}

Be perceptive. The best verse isn't always the highest similarity score — it's the one that speaks to the ROOT issue."""


def depth_analysis(query: str, user_profile: dict, life_stage: dict, routed: dict, top_verses: list[dict]) -> dict:
    verse_list = ""
    for v in top_verses[:3]:
        vd = get_verse_by_id(v["verse_id"])
        if vd:
            verse_list += f"\n[{v['verse_id']}] Ch.{vd.get('chapter')}, V.{vd.get('verse')}: {vd.get('translation_en', '')[:150]}\n"

    context = f"""User message: {query}

Age: {user_profile.get('age')}, Life Stage: {life_stage.get('name', '')}, Gita familiarity: {user_profile.get('gita_familiarity', 'NEVER_READ')}
Detected problems: {', '.join(routed.get('problems', []))}
Detected emotions: {', '.join(routed.get('emotions', []))}
Emotional intensity: {routed.get('emotional_intensity', 0.5)}

Candidate verses:
{verse_list}"""

    try:
        return json.loads(_llm(DEPTH_SYSTEM, context, max_tokens=300))
    except Exception:
        return {
            "real_struggle": routed.get("summary", ""),
            "what_they_need": "Empathy and practical wisdom",
            "best_verse_id": top_verses[0]["verse_id"] if top_verses else "",
            "wrong_approach": "Generic platitudes",
            "tone": "warm_friend",
        }


# ─── AGENT 4: STRUCTURED SYNTHESIS ───

SYNTHESIS_SYSTEM = """You are GitaAI's final synthesis agent. You craft the actual response.

You receive: user's message, full context from previous agents, the chosen verse.

Output ONLY valid JSON (no markdown fences, no explanation outside the JSON):

For life_problem or philosophical:
{
  "type": "guidance",
  "language": "en|hi|hinglish",
  "empathy": "1-2 sentences that show you deeply understood THEIR specific situation. Reference their actual words/context. NOT generic.",
  "verse": {
    "chapter": <number>,
    "verse": <number>,
    "transliteration": "<Sanskrit transliteration>",
    "translation": "<Plain modern English translation>",
    "translation_hi": "<Hindi translation if available, else empty string>",
    "reference": "Chapter X, Verse Y"
  },
  "insight": "2-3 sentences: what this verse specifically means for THIS person's situation. Name their actual problem. Be direct.",
  "action": "One very specific, concrete action they can take in the next 24 hours. Not 'reflect on your dharma' but 'Write down 3 reasons you chose [their specific thing]'",
  "reflection": "One genuine question that will make them think differently. Not rhetorical.",
  "follow_ups": ["Short follow-up question 1?", "Short follow-up question 2?", "Short follow-up question 3?"]
}

follow_ups rules:
- 3 natural questions the user might want to ask next, specific to THEIR situation
- Keep them short (6-10 words each)
- NOT generic ("Tell me more") — make them contextual e.g. "How do I practice this at work?", "What does Krishna say about anger towards parents?"
- Write them as if the user is asking, in first person or second person

For greeting/casual:
{
  "type": "greeting",
  "language": "en|hi|hinglish",
  "response": "Natural, warm 1-3 sentence reply. If first message, invite them to share what's weighing on them."
}

For verse_followup:
{
  "type": "followup",
  "language": "en|hi|hinglish",
  "response": "Concise, thoughtful answer to their specific question about the verse/chapter. 3-6 sentences."
}

LANGUAGE RULES (MANDATORY — this overrides everything else):
- The RESPOND IN LANGUAGE field tells you EXACTLY what language to use. You MUST use it.
- language=hinglish: Write your ENTIRE response mixing Hindi and English naturally, the way urban Indians actually talk. Use Hindi for emotions/feelings and English for concepts. Examples of Hinglish tone: "Yaar, sach batao...", "Dekho, tumhara jo dard hai...", "Ye situation mein sab aisa hi feel karte hain", "Ek kaam karo aaj", "Tumhare andar jo dar hai..."  — NEVER write a full-English response if language=hinglish.
- language=hi: Respond primarily in Hindi (Devanagari encouraged, Roman Hindi acceptable). Use English only for technical terms.
- language=en: Respond fully in English.
- If you are unsure, default to the detected language. NEVER ignore this field.

QUALITY RULES:
- empathy must reference something specific from their message (not "I understand you're going through a tough time")
- action must be specific enough that they know exactly what to do (includes WHAT, not just why)
- Do NOT start with "As per the Bhagavad Gita" or "Great question"
- The verse translation should read naturally, not like a textbook
- If word-by-word meanings are provided, use them to anchor your insight — explain 1-2 key Sanskrit words (e.g. "Karma literally means action, not fate") to make the verse feel alive and specific, not generic"""


def synthesize_structured(
    query: str,
    user_profile: dict,
    life_stage: dict,
    routed: dict,
    depth: dict,
    classification: dict,
    best_verse: dict | None,
    history: list[dict],
) -> dict:
    query_type = classification.get("query_type", "life_problem")
    language = classification.get("language", "en")

    verse_block = ""
    if best_verse:
        verse_block = f"""
CHOSEN VERSE:
ID: {best_verse.get('id')}
Chapter {best_verse.get('chapter')}, Verse {best_verse.get('verse')}
Sanskrit: {best_verse.get('sanskrit', '')}
Transliteration: {best_verse.get('transliteration', '')}
Translation EN: {best_verse.get('translation_en', '')}
Translation HI: {best_verse.get('translation_hi', '')}
Commentaries (excerpts):"""
        for i, (name, text) in enumerate(best_verse.get("commentaries", {}).items()):
            if i >= 2:
                break
            verse_block += f"\n- {name}: {str(text)[:250]}"
        if best_verse.get("word_meanings"):
            verse_block += f"\nWord-by-word meanings: {str(best_verse['word_meanings'])[:500]}"

    history_block = ""
    if history:
        history_block = "\nCONVERSATION HISTORY:\n" + "\n".join(
            f"{m['role'].upper()}: {m['content'][:180]}" for m in history[-4:]
        )

    context = f"""QUERY TYPE: {query_type}
RESPOND IN LANGUAGE: {language}

USER:
- Age: {user_profile.get('age')}, Life Stage: {life_stage.get('name', '')}
- Gita familiarity: {user_profile.get('gita_familiarity', 'NEVER_READ')}
- Resonant Gita concepts: {', '.join(life_stage.get('resonant_concepts', []))}
- Tone: {life_stage.get('tone', 'warm')} | Avoid: {', '.join(life_stage.get('avoid', []))}

DEPTH ANALYSIS (from internal agent debate):
- Real struggle: {depth.get('real_struggle', '')}
- What they need: {depth.get('what_they_need', '')}
- Recommended tone: {depth.get('tone', 'warm_friend')}
- What NOT to say: {depth.get('wrong_approach', '')}

LIFE STAGE CONTEXT:
- Primary concerns: {', '.join(life_stage.get('primary_concerns', []))}
- India pressures: {', '.join(life_stage.get('india_pressures', [])[:3])}

DETECTED: problems={routed.get('problems', [])}, emotions={routed.get('emotions', [])}, intensity={routed.get('emotional_intensity', 0.5)}
{verse_block}
{history_block}

USER'S MESSAGE:
{query}"""

    raw = _llm(SYNTHESIS_SYSTEM, context, max_tokens=700)

    # Strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw[raw.find("{"):raw.rfind("}") + 1]

    try:
        return json.loads(raw)
    except Exception:
        # Fallback structured response
        fb: dict = {"type": "guidance", "language": language, "empathy": "I hear you.", "insight": raw[:400], "action": "Take one small step today.", "reflection": "What would you do if you weren't afraid?"}
        if best_verse:
            fb["verse"] = {
                "chapter": best_verse.get("chapter"), "verse": best_verse.get("verse"),
                "transliteration": best_verse.get("transliteration", ""),
                "translation": best_verse.get("translation_en", ""),
                "translation_hi": best_verse.get("translation_hi", ""),
                "reference": f"Chapter {best_verse.get('chapter')}, Verse {best_verse.get('verse')}",
            }
        return fb


# ─── MAIN PIPELINE ───

def process_query(query: str, user_profile: dict, history: list[dict] = None, seen_verse_ids: list[str] = None) -> dict:
    if history is None:
        history = []
    if seen_verse_ids is None:
        seen_verse_ids = []

    # Step 1: Safety
    safety = assess_risk(query)
    if safety["risk_level"] == "immediate":
        return {
            "response": safety["message"],
            "structured": {"type": "safety", "response": safety["message"]},
            "risk_level": "immediate",
            "verse_ids": [],
            "detected_problems": [],
        }

    # Step 2: Classify query type + language
    classification = classify(query, history)
    query_type = classification.get("query_type", "life_problem")
    language = classification.get("language", "en")

    # Step 3: Short-circuit for greetings/casual — single synthesis call
    if query_type in ("greeting", "casual"):
        structured = synthesize_structured(query, user_profile, {}, {}, {}, classification, None, history)
        return {
            "response": structured.get("response", "Namaste."),
            "structured": structured,
            "risk_level": "none",
            "verse_ids": [],
            "detected_problems": [],
            "query_type": query_type,
            "language": language,
        }

    # Step 4: Route (classify problem + emotion)
    routed = route(query)

    safety_prefix = ""
    if routed.get("risk_level") in ("high", "immediate") or safety["risk_level"] == "high":
        safety_prefix = CRISIS_RESOURCES + "\n\n---\n\n"

    # Step 5: Life stage
    life_stage = get_life_stage_for_age(user_profile.get("age", 30)) or {}

    # Step 6: Verse search (enhanced with route context)
    top_verses = []
    best_verse_data = None
    if classification.get("needs_verse", True):
        enhanced = f"{query} {routed.get('summary', '')}"
        top_verses = search_verses(enhanced, top_k=8)

        # Boost verses from life-stage resonant chapters
        resonant_chapters = set(life_stage.get("resonant_chapters", []))
        if resonant_chapters:
            for v in top_verses:
                chap = int(v["verse_id"].split("-")[0]) if "-" in v["verse_id"] else 0
                if chap in resonant_chapters:
                    v["similarity"] *= 1.3  # 30% relevance boost
            top_verses.sort(key=lambda x: x["similarity"], reverse=True)

        # Filter out verses already shown in this session to avoid repetition
        if seen_verse_ids:
            seen_set = set(seen_verse_ids)
            fresh = [v for v in top_verses if v["verse_id"] not in seen_set]
            # Only filter if we have enough fresh candidates; otherwise keep all
            if len(fresh) >= 3:
                top_verses = fresh

        # Step 7: Depth analysis — debates which verse is best + understands person deeply
        depth = depth_analysis(query, user_profile, life_stage, routed, top_verses)

        # Use depth's recommended verse if valid
        best_verse_id = depth.get("best_verse_id", "")
        if best_verse_id:
            best_verse_data = get_verse_by_id(best_verse_id)
        if not best_verse_data and top_verses:
            best_verse_data = get_verse_by_id(top_verses[0]["verse_id"])
    else:
        depth = {"real_struggle": query, "what_they_need": "Clear answer", "tone": "warm_friend", "wrong_approach": ""}

    # Step 8: Final structured synthesis
    structured = synthesize_structured(
        query, user_profile, life_stage, routed, depth, classification, best_verse_data, history
    )

    # Inject verse data from actual DB record to ensure accuracy
    if best_verse_data and "verse" in structured:
        v = best_verse_data
        structured["verse"] = {
            "chapter": v.get("chapter"),
            "verse": v.get("verse"),
            "transliteration": v.get("transliteration", ""),
            "translation": v.get("translation_en", ""),
            "translation_hi": v.get("translation_hi", ""),
            "reference": f"Chapter {v.get('chapter')}, Verse {v.get('verse')}",
        }

    # Add safety prefix to empathy if needed
    if safety_prefix and "empathy" in structured:
        structured["safety_note"] = CRISIS_RESOURCES

    if safety["risk_level"] == "moderate":
        structured["safety_note"] = "Agar mushkil waqt se guzar rahe ho, please kisi se baat karo. You deserve support. 🙏"

    # Plain text fallback for backward compat
    plain = _structured_to_plain(structured)

    return {
        "response": plain,
        "structured": structured,
        "risk_level": safety["risk_level"],
        "verse_ids": [v["verse_id"] for v in top_verses[:3]],
        "detected_problems": routed.get("problems", []),
        "query_type": query_type,
        "language": language,
    }


def _structured_to_plain(s: dict) -> str:
    if s.get("type") in ("greeting", "casual", "followup"):
        return s.get("response", "")
    parts = []
    if s.get("empathy"):
        parts.append(s["empathy"])
    if s.get("verse"):
        v = s["verse"]
        parts.append(f"\n> *{v.get('transliteration', '')}*\n> \"{v.get('translation', '')}\"\n> — {v.get('reference', '')}")
    if s.get("insight"):
        parts.append(s["insight"])
    if s.get("action"):
        parts.append(f"**One thing to do:** {s['action']}")
    if s.get("reflection"):
        parts.append(f"*{s['reflection']}*")
    return "\n\n".join(parts)
