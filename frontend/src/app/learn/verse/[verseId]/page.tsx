"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Sparkles, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { markRead, isRead } from "@/lib/progress";
import { CHAPTER_VERSE_COUNTS } from "@/lib/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LIFE_STAGES = [
  { id: "STUDENT", label: "Student", age: "16–22", emoji: "🎓" },
  { id: "YOUNG_PROFESSIONAL", label: "Young Professional", age: "22–30", emoji: "💼" },
  { id: "EARLY_FAMILY", label: "Early Family", age: "28–40", emoji: "🏠" },
  { id: "MID_CAREER", label: "Mid Career", age: "35–50", emoji: "⚡" },
  { id: "MIDLIFE", label: "Midlife", age: "45–60", emoji: "🌅" },
  { id: "PRE_ELDER", label: "Pre-Elder", age: "55–65", emoji: "🌿" },
  { id: "ELDER", label: "Elder", age: "65+", emoji: "🙏" },
];

interface VerseData {
  id: string; chapter: number; verse: number;
  sanskrit: string; transliteration: string;
  translation_en: string; translation_hi: string;
  word_meanings: string;
}

export default function VersePage() {
  const { verseId } = useParams<{ verseId: string }>();
  const router = useRouter();

  const [verse, setVerse] = useState<VerseData | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [interpStage, setInterpStage] = useState<{ name: string; age_lower: number; age_upper: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [interpLoading, setInterpLoading] = useState(false);
  const [read, setRead] = useState(false);

  // Load verse
  useEffect(() => {
    if (!verseId) return;
    setLoading(true); setInterpretation(null);
    fetch(`${API_BASE}/api/verses/${verseId}`)
      .then((r) => r.json())
      .then((v: VerseData) => {
        setVerse(v);
        // Auto-mark read
        markRead(verseId);
        setRead(true);
      })
      .finally(() => setLoading(false));
  }, [verseId]);

  // Pre-select user's life stage
  useEffect(() => {
    const uid = localStorage.getItem("gitaai_user_id");
    if (!uid) return;
    fetch(`${API_BASE}/api/users/${uid}`)
      .then((r) => r.json())
      .then((u) => { if (u.life_stage_id) setSelectedStage(u.life_stage_id); })
      .catch(() => {});
  }, []);

  async function generateInterpretation() {
    if (!verseId || !selectedStage) return;
    setInterpLoading(true); setInterpretation(null);
    try {
      const res = await fetch(`${API_BASE}/api/learn/verses/${verseId}/interpret?life_stage=${selectedStage}`);
      const data = await res.json();
      setInterpretation(data.interpretation);
      setInterpStage(data.life_stage);
    } catch {
      setInterpretation("Unable to generate interpretation. Please try again.");
    } finally {
      setInterpLoading(false);
    }
  }

  function askAboutVerse() {
    if (!verse) return;
    const msg = `I was reading Chapter ${verse.chapter}, Verse ${verse.verse}: "${verse.translation_en?.slice(0, 120)}..." — can you help me understand how this applies to my life?`;
    localStorage.setItem("gitaai_draft_message", msg);
    router.push("/chat");
  }

  // Navigate prev/next verse
  function navigateTo(delta: number) {
    if (!verse) return;
    const chTotal = CHAPTER_VERSE_COUNTS[verse.chapter] ?? 0;
    const nextVerse = verse.verse + delta;
    if (nextVerse < 1 || nextVerse > chTotal) return;
    const id = `BG_${String(verse.chapter).padStart(2, "0")}_${String(nextVerse).padStart(3, "0")}`;
    router.push(`/learn/verse/${id}`);
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-sacred">
      <Loader2 className="w-6 h-6 animate-spin text-saffron" />
    </div>
  );

  if (!verse) return (
    <div className="flex h-screen items-center justify-center bg-sacred">
      <p className="text-text-secondary">Verse not found.</p>
    </div>
  );

  const chTotal = CHAPTER_VERSE_COUNTS[verse.chapter] ?? 0;

  return (
    <div className="min-h-screen bg-sacred">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="text-text-secondary hover:text-maroon transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-maroon text-sm">Chapter {verse.chapter}, Verse {verse.verse}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {read && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              <span className="text-xs text-text-secondary">{read ? "Read" : "Unread"}</span>
            </div>
          </div>
          <button onClick={askAboutVerse}
            className="flex items-center gap-1.5 text-xs bg-saffron/10 text-saffron-dark border border-saffron/20 px-3 py-1.5 rounded-lg hover:bg-saffron hover:text-white transition-all cursor-pointer">
            <MessageCircle className="w-3.5 h-3.5" /> Ask GitaAI
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Sanskrit card — premium dark */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-maroon via-maroon-light to-amber-950" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/8" />
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full border border-white/8" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full border border-white/8" />
          </div>
          <div className="relative p-6 text-center">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Chapter {verse.chapter} · Verse {verse.verse}</p>
            <p className="sanskrit text-base text-white/90 leading-loose whitespace-pre-line mb-4">
              {verse.sanskrit}
            </p>
            <div className="h-px bg-white/15 mb-4" />
            <p className="text-xs text-white/50 italic leading-relaxed">
              {verse.transliteration}
            </p>
          </div>
        </div>

        {/* Translation card */}
        <div className="card-premium rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-text-secondary font-medium">Translation</p>
            <div className="flex rounded-lg overflow-hidden border border-gold/30">
              <button onClick={() => setLang("en")}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${lang === "en" ? "bg-saffron text-white" : "text-text-secondary hover:bg-warm-gray"}`}>
                English
              </button>
              <button onClick={() => setLang("hi")}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${lang === "hi" ? "bg-saffron text-white" : "text-text-secondary hover:bg-warm-gray"}`}>
                हिंदी
              </button>
            </div>
          </div>
          <p className={`leading-relaxed text-text-primary ${lang === "hi" ? "text-base font-medium" : "text-sm"}`}>
            {lang === "en" ? verse.translation_en : verse.translation_hi}
          </p>
        </div>

        {/* Word meanings accordion */}
        {verse.word_meanings && (
          <details className="card-premium rounded-2xl overflow-hidden group">
            <summary className="px-5 py-3.5 text-xs font-medium text-text-secondary cursor-pointer hover:text-maroon transition-colors list-none flex items-center justify-between">
              <span className="uppercase tracking-widest">Word Meanings</span>
              <span className="text-gold group-open:rotate-45 transition-transform text-base">+</span>
            </summary>
            <div className="px-5 pb-4 pt-1 text-xs text-text-secondary leading-loose border-t border-gold/10">
              {verse.word_meanings}
            </div>
          </details>
        )}

        {/* Life stage interpretation */}
        <div className="card-premium rounded-2xl p-5">
          <p className="font-semibold text-maroon mb-1 text-sm">What does this mean for you?</p>
          <p className="text-xs text-text-secondary mb-4">Choose your life stage, then tap Generate.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {LIFE_STAGES.map((stage) => (
              <button key={stage.id} onClick={() => { setSelectedStage(stage.id); setInterpretation(null); }}
                className={`flex flex-col items-start px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedStage === stage.id
                    ? "bg-maroon text-white border-maroon shadow-md"
                    : "bg-white border-gold/25 hover:border-saffron/40 hover:shadow-sm"
                }`}>
                <span className="text-base mb-0.5">{stage.emoji}</span>
                <span className="text-xs font-semibold leading-tight">{stage.label}</span>
                <span className={`text-[10px] mt-0.5 ${selectedStage === stage.id ? "text-white/60" : "text-text-secondary/60"}`}>
                  {stage.age}
                </span>
              </button>
            ))}
          </div>

          {!interpretation ? (
            <button onClick={generateInterpretation}
              disabled={!selectedStage || interpLoading}
              className="w-full flex items-center justify-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-40 cursor-pointer shadow-sm">
              {interpLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating interpretation...</>
                : <><Sparkles className="w-4 h-4" /> Generate Interpretation</>
              }
            </button>
          ) : (
            <div>
              <div className="divider-gold mb-4" />
              {interpStage && (
                <p className="text-xs font-semibold text-saffron-dark mb-3 uppercase tracking-wide">
                  For the {interpStage.name} · {interpStage.age_lower}–{interpStage.age_upper}
                </p>
              )}
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {interpretation}
              </p>
              <button onClick={() => setInterpretation(null)}
                className="mt-4 text-xs text-text-secondary hover:text-maroon underline cursor-pointer">
                Try a different stage
              </button>
            </div>
          )}
        </div>

        {/* Ask GitaAI CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-maroon/5 to-saffron/5 border border-gold/20 p-5 text-center">
          <p className="text-sm text-text-secondary mb-3">
            Want to explore how this verse applies to your specific situation?
          </p>
          <button onClick={askAboutVerse}
            className="flex items-center gap-2 mx-auto bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer">
            <MessageCircle className="w-4 h-4" /> Discuss with GitaAI
          </button>
        </div>

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => navigateTo(-1)} disabled={verse.verse <= 1}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-maroon disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs text-text-secondary/50">{verse.verse} / {chTotal}</span>
          <button onClick={() => navigateTo(1)} disabled={verse.verse >= chTotal}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-maroon disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
