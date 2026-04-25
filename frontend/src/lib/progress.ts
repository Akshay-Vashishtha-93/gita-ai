// Reading progress — stored in localStorage
// Key: 'gitaai_read_verses' → JSON array of verse IDs

const KEY = "gitaai_read_verses";

// Verse counts per chapter (from data)
export const CHAPTER_VERSE_COUNTS: Record<number, number> = {
  1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47, 7: 30,
  8: 28, 9: 34, 10: 42, 11: 55, 12: 20, 13: 35, 14: 27,
  15: 20, 16: 24, 17: 28, 18: 78,
};

export const TOTAL_VERSES = 701;

function getReadSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markRead(verseId: string): void {
  const set = getReadSet();
  set.add(verseId);
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isRead(verseId: string): boolean {
  return getReadSet().has(verseId);
}

export function getReadVerses(): string[] {
  return [...getReadSet()];
}

export function getChapterProgress(chapter: number): { read: number; total: number; pct: number } {
  const set = getReadSet();
  const total = CHAPTER_VERSE_COUNTS[chapter] ?? 0;
  const prefix = `BG_${String(chapter).padStart(2, "0")}_`;
  const read = [...set].filter((id) => id.startsWith(prefix)).length;
  return { read, total, pct: total ? Math.round((read / total) * 100) : 0 };
}

export function getOverallProgress(): { read: number; total: number; pct: number } {
  const read = getReadSet().size;
  return { read, total: TOTAL_VERSES, pct: Math.round((read / TOTAL_VERSES) * 100) };
}
