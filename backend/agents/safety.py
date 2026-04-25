"""
Safety Agent — Always runs first. Checks for crisis signals.
If risk is HIGH or IMMEDIATE, halts all Gita content and shows crisis resources.
"""
import re

CRISIS_RESOURCES = """
🆘 **If you or someone you know is in crisis, please reach out:**

- **iCall (TISS):** 9152987821 (Mon-Sat, 8am-10pm)
- **Vandrevala Foundation:** 1860-2662-345 (24/7)
- **AASRA:** 9820466726 (24/7)
- **Snehi:** 044-24640050 (24/7)
- **Connecting NGO:** 9922001122 (12pm-8pm)

You are not alone. Please talk to someone. 🙏
"""

IMMEDIATE_PATTERNS = [
    r"(don'?t\s+want\s+to\s+live|want\s+to\s+die|kill\s+myself|end\s+(my|it\s+all)|suicide)",
    r"(jeena\s+nahi|mar\s+ja|khatam\s+kar|zindagi\s+se\s+tang|marna\s+chahta|marna\s+chahti)",
    r"(self[- ]harm|cut\s+myself|hurt\s+myself|slit|overdose)",
    r"(no\s+reason\s+to\s+live|better\s+off\s+dead|world.*without\s+me)",
]

HIGH_PATTERNS = [
    r"(nobody\s+would\s+miss|burden\s+on|kisi\s+ko\s+fark\s+nahi|no\s+one\s+cares)",
    r"(hopeless|can'?t\s+go\s+on|give\s+up\s+on\s+life|nothing\s+matters\s+anymore)",
    r"(hurting\s+myself|self[- ]?destruct|drinking\s+to\s+(forget|cope)|substance)",
]

MODERATE_PATTERNS = [
    r"(very\s+depressed|deeply\s+sad|can'?t\s+stop\s+crying|breakdown|falling\s+apart)",
    r"(panic\s+attack|anxiety\s+attack|can'?t\s+breathe|heart\s+racing)",
    r"(domestic\s+violence|being\s+hit|abused|molest)",
]


def assess_risk(text: str) -> dict:
    """Assess risk level from user input. Returns risk level and matched signals."""
    text_lower = text.lower().strip()

    # Check IMMEDIATE
    for pattern in IMMEDIATE_PATTERNS:
        if re.search(pattern, text_lower):
            return {
                "risk_level": "immediate",
                "action": "HALT_ALL_CONTENT",
                "message": CRISIS_RESOURCES,
                "matched_signal": pattern,
            }

    # Check HIGH
    for pattern in HIGH_PATTERNS:
        if re.search(pattern, text_lower):
            return {
                "risk_level": "high",
                "action": "SHOW_RESOURCES_FIRST",
                "message": CRISIS_RESOURCES,
                "matched_signal": pattern,
            }

    # Check MODERATE
    for pattern in MODERATE_PATTERNS:
        if re.search(pattern, text_lower):
            return {
                "risk_level": "moderate",
                "action": "ADD_SUPPORTIVE_FRAMING",
                "matched_signal": pattern,
            }

    return {"risk_level": "none", "action": "PROCEED"}
