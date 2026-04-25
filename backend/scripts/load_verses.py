#!/usr/bin/env python3
"""
Fetch all 700 Bhagavad Gita verses from the Vedic Scriptures API
and save them as a structured JSON file.

API: https://vedicscriptures.github.io/slok/{chapter}/{verse}

Usage:
    python load_verses.py
    python load_verses.py --output /path/to/output.json
    python load_verses.py --chapters 1 2 18   # fetch only specific chapters
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, List

# Chapter verse counts for Bhagavad Gita (18 chapters, 700 total verses)
CHAPTER_VERSE_COUNTS = {
    1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47, 7: 30, 8: 28, 9: 34,
    10: 42, 11: 55, 12: 20, 13: 35, 14: 27, 15: 20, 16: 24, 17: 28, 18: 78,
}

API_BASE_URL = "https://vedicscriptures.github.io/slok"

# Known speakers for each verse (chapter, verse) -> speaker
# This is a best-effort mapping based on traditional attributions.
# The API does not provide speaker info directly.
SPEAKER_RANGES = {
    # Chapter 1
    (1, 1): "DHRITARASHTRA",
    # 1.2 - 1.11: Sanjaya narrating Duryodhana's words (attributed to SANJAYA/DURYODHANA)
    # 1.12 - 1.19: Sanjaya narrating events
    # 1.20 - 1.47: Arjuna speaks (with Sanjaya framing)
    # Chapter 2 onwards: mostly Krishna, with some Arjuna and Sanjaya
}


def detect_speaker(chapter: int, verse: int, slok_text: str) -> str:
    """
    Detect the speaker of a verse based on the Sanskrit text markers.
    The Sanskrit text often begins with 'X uvaca' (X said).
    Falls back to heuristic chapter/verse-based attribution.
    """
    text_lower = slok_text.lower() if slok_text else ""

    # Check for explicit speaker markers in the Sanskrit text
    if "धृतराष्ट्र उवाच" in slok_text or "dhṛtarāṣṭra uvāca" in text_lower:
        return "DHRITARASHTRA"
    if "सञ्जय उवाच" in slok_text or "sañjaya uvāca" in text_lower:
        return "SANJAYA"
    if "अर्जुन उवाच" in slok_text or "arjuna uvāca" in text_lower:
        return "ARJUNA"
    if "श्रीभगवानुवाच" in slok_text or "śrī-bhagavān uvāca" in text_lower or "śrībhagavānuvāca" in text_lower:
        return "KRISHNA"

    # Heuristic: assign speaker based on chapter/verse ranges
    # These are approximate based on traditional Gita structure
    if chapter == 1:
        if verse == 1:
            return "DHRITARASHTRA"
        elif verse <= 11:
            return "DURYODHANA"
        elif verse <= 19:
            return "SANJAYA"
        elif verse <= 47:
            return "ARJUNA"
    elif chapter == 2:
        if verse == 1:
            return "SANJAYA"
        elif verse <= 3:
            return "KRISHNA"
        elif verse <= 10:
            return "ARJUNA" if verse <= 8 else "SANJAYA"
        elif verse <= 53:
            return "KRISHNA"
        elif verse == 54:
            return "ARJUNA"
        else:
            return "KRISHNA"
    elif chapter == 11:
        if verse <= 4:
            return "ARJUNA"
        elif verse <= 8:
            return "KRISHNA"
        elif verse <= 14:
            return "SANJAYA"
        elif verse <= 31:
            return "ARJUNA"
        elif verse <= 34:
            return "KRISHNA"
        elif verse <= 44:
            return "ARJUNA"
        elif verse <= 50:
            return "KRISHNA"
        elif verse <= 51:
            return "ARJUNA"
        else:
            return "SANJAYA" if verse >= 52 and verse <= 55 else "KRISHNA"
    elif chapter == 18:
        if verse == 1:
            return "ARJUNA"
        elif verse <= 72:
            return "KRISHNA"
        elif verse == 73:
            return "ARJUNA"
        else:
            return "SANJAYA"

    # Default: Most of the Gita (chapters 3-17 and parts of others) is Krishna speaking
    return "KRISHNA"


def extract_commentaries(raw: dict) -> dict:
    """Extract commentaries from the API response into a clean dict."""
    commentary_keys = {
        "sankar": "shankaracharya",
        "raman": "ramanujacharya",
        "madhav": "madhvacharya",
        "srid": "sridhara_swami",
        "dhan": "dhanpati",
        "venkat": "venkatanatha",
        "puru": "purushottamji",
        "neel": "neelkanth",
        "prabhu": "prabhupada",
        "chinmay": "chinmayananda",
        "ms": "madhusudan_saraswati",
        "abhinav": "abhinavagupta",
        "jaya": "jayatritha",
        "vallabh": "vallabhacharya",
        "anand": "anandgiri",
        "gambir": "gambirananda",
        "tej": "tejomayananda",
        "siva": "sivananda",
        "purohit": "purohit_swami",
        "san": "sankaranarayan",
        "adi": "adidevananda",
        "rams": "ramsukhdas",
    }

    commentaries = {}
    for api_key, name in commentary_keys.items():
        if api_key in raw and isinstance(raw[api_key], dict):
            entry = raw[api_key]
            commentary = {}
            # Include all available text fields
            if "et" in entry:
                commentary["en"] = entry["et"]
            if "ec" in entry:
                commentary["en_commentary"] = entry["ec"]
            if "ht" in entry:
                commentary["hi"] = entry["ht"]
            if "hc" in entry:
                commentary["hi_commentary"] = entry["hc"]
            if "sc" in entry:
                commentary["sanskrit"] = entry["sc"]
            if "author" in entry:
                commentary["author"] = entry["author"]
            if commentary:
                commentaries[name] = commentary
    return commentaries


def get_best_english_translation(raw: dict) -> str:
    """Get the best English translation, preferring certain authors."""
    # Priority order for English translations
    priority = ["gambir", "siva", "purohit", "prabhu", "san", "adi"]
    for key in priority:
        if key in raw and isinstance(raw[key], dict) and "et" in raw[key]:
            return raw[key]["et"]
    # Fallback: any English translation
    for key, val in raw.items():
        if isinstance(val, dict) and "et" in val:
            return val["et"]
    return ""


def get_best_hindi_translation(raw: dict) -> str:
    """Get the best Hindi translation."""
    priority = ["tej", "rams"]
    for key in priority:
        if key in raw and isinstance(raw[key], dict) and "ht" in raw[key]:
            return raw[key]["ht"]
    for key, val in raw.items():
        if isinstance(val, dict) and "ht" in val:
            return val["ht"]
    return ""


def get_word_meanings(raw: dict) -> str:
    """Extract word meanings from Sivananda's commentary if available."""
    if "siva" in raw and isinstance(raw["siva"], dict):
        ec = raw["siva"].get("ec", "")
        if ec:
            # Sivananda's ec field often contains word-by-word meanings
            return ec
    return ""


def fetch_verse(chapter: int, verse: int, max_retries: int = 3) -> dict | None:
    """Fetch a single verse from the API with retries."""
    url = f"{API_BASE_URL}/{chapter}/{verse}"

    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Gita-AI-Loader/1.0)",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [WARN] Verse {chapter}.{verse} not found (404)")
                return None
            print(f"  [WARN] HTTP {e.code} for {chapter}.{verse}, attempt {attempt + 1}/{max_retries}")
        except (urllib.error.URLError, TimeoutError, Exception) as e:
            print(f"  [WARN] Error fetching {chapter}.{verse}: {e}, attempt {attempt + 1}/{max_retries}")

        if attempt < max_retries - 1:
            time.sleep(1 * (attempt + 1))

    print(f"  [ERROR] Failed to fetch verse {chapter}.{verse} after {max_retries} attempts")
    return None


def process_verse(raw: dict) -> dict:
    """Transform raw API response into our target format."""
    chapter = raw.get("chapter", 0)
    verse = raw.get("verse", 0)
    slok = raw.get("slok", "")
    transliteration = raw.get("transliteration", "")

    return {
        "id": f"BG_{chapter:02d}_{verse:03d}",
        "chapter": chapter,
        "verse": verse,
        "sanskrit": slok,
        "transliteration": transliteration,
        "translation_en": get_best_english_translation(raw),
        "translation_hi": get_best_hindi_translation(raw),
        "speaker": detect_speaker(chapter, verse, slok + " " + transliteration),
        "word_meanings": get_word_meanings(raw),
        "commentaries": extract_commentaries(raw),
    }


def fetch_all_verses(chapters: list[int] | None = None, delay: float = 0.15) -> list[dict]:
    """Fetch all verses for the specified chapters (or all 18 chapters)."""
    if chapters is None:
        chapters = list(range(1, 19))

    all_verses = []
    total_expected = sum(CHAPTER_VERSE_COUNTS.get(c, 0) for c in chapters)
    fetched = 0
    failed = 0

    print(f"Fetching {total_expected} verses across {len(chapters)} chapters...")
    print(f"API: {API_BASE_URL}")
    print()

    for chapter in chapters:
        verse_count = CHAPTER_VERSE_COUNTS.get(chapter)
        if verse_count is None:
            print(f"[WARN] Unknown chapter {chapter}, skipping")
            continue

        print(f"Chapter {chapter}: {verse_count} verses")

        for verse_num in range(1, verse_count + 1):
            raw = fetch_verse(chapter, verse_num)
            if raw:
                processed = process_verse(raw)
                all_verses.append(processed)
                fetched += 1
            else:
                failed += 1

            # Progress indicator
            if verse_num % 10 == 0 or verse_num == verse_count:
                print(f"  Progress: {verse_num}/{verse_count} verses", end="\r")

            # Rate limiting
            if delay > 0:
                time.sleep(delay)

        print(f"  Done: {verse_count} verses" + " " * 20)

    print()
    print(f"Fetch complete: {fetched} fetched, {failed} failed, {total_expected} expected")
    return all_verses


def save_verses(verses: list[dict], output_path: str) -> None:
    """Save verses to a JSON file."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    with open(output, "w", encoding="utf-8") as f:
        json.dump(verses, f, ensure_ascii=False, indent=2)

    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Saved {len(verses)} verses to {output} ({size_mb:.1f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Fetch Bhagavad Gita verses from API")
    parser.add_argument(
        "--output", "-o",
        default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "verses.json"),
        help="Output JSON file path (default: ../data/verses.json)",
    )
    parser.add_argument(
        "--chapters", "-c",
        nargs="+",
        type=int,
        help="Specific chapters to fetch (default: all 1-18)",
    )
    parser.add_argument(
        "--delay", "-d",
        type=float,
        default=0.15,
        help="Delay between API requests in seconds (default: 0.15)",
    )
    args = parser.parse_args()

    verses = fetch_all_verses(chapters=args.chapters, delay=args.delay)

    if not verses:
        print("No verses fetched. Exiting.")
        sys.exit(1)

    save_verses(verses, args.output)

    # Print summary stats
    chapters_found = set(v["chapter"] for v in verses)
    speakers = {}
    for v in verses:
        speakers[v["speaker"]] = speakers.get(v["speaker"], 0) + 1

    print(f"\nSummary:")
    print(f"  Chapters: {sorted(chapters_found)}")
    print(f"  Total verses: {len(verses)}")
    print(f"  Speakers: {json.dumps(speakers, indent=4)}")


if __name__ == "__main__":
    main()
