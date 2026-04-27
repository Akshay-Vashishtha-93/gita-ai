"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { getChapterProgress, isRead } from "@/lib/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CHAPTER_INFO: Record<number, { name: string; sanskrit: string; concept: string; gradient: string }> = {
  1:  { name: "Arjuna's Dilemma",              sanskrit: "अर्जुनविषादयोग",   concept: "Grief & Duty",           gradient: "from-rose-950 via-red-900 to-stone-950" },
  2:  { name: "The Eternal Self",              sanskrit: "सांख्ययोग",         concept: "Soul & Knowledge",       gradient: "from-amber-950 via-amber-900 to-stone-950" },
  3:  { name: "Path of Action",                sanskrit: "कर्मयोग",            concept: "Selfless Action",        gradient: "from-orange-950 via-orange-900 to-stone-950" },
  4:  { name: "Knowledge & Renunciation",      sanskrit: "ज्ञानकर्मसंन्यासयोग", concept: "Wisdom & Sacrifice",     gradient: "from-yellow-950 via-amber-900 to-stone-950" },
  5:  { name: "True Renunciation",             sanskrit: "कर्मसंन्यासयोग",     concept: "Detachment",             gradient: "from-emerald-950 via-emerald-900 to-stone-950" },
  6:  { name: "The Yoga of Meditation",        sanskrit: "ध्यानयोग",           concept: "Mind & Meditation",      gradient: "from-teal-950 via-teal-900 to-stone-950" },
  7:  { name: "Knowledge of the Absolute",     sanskrit: "ज्ञानविज्ञानयोग",    concept: "Divine Nature",          gradient: "from-cyan-950 via-cyan-900 to-stone-950" },
  8:  { name: "Attaining the Eternal",         sanskrit: "अक्षरब्रह्मयोग",     concept: "Eternal & Death",        gradient: "from-sky-950 via-sky-900 to-stone-950" },
  9:  { name: "Royal Knowledge",               sanskrit: "राजविद्याराजगुह्ययोग", concept: "Devotion & Creation",   gradient: "from-blue-950 via-blue-900 to-stone-950" },
  10: { name: "Divine Manifestations",         sanskrit: "विभूतियोग",          concept: "God in Everything",      gradient: "from-indigo-950 via-indigo-900 to-stone-950" },
  11: { name: "The Universal Form",            sanskrit: "विश्वरूपदर्शनयोग",   concept: "Cosmic Vision",          gradient: "from-violet-950 via-violet-900 to-stone-950" },
  12: { name: "The Path of Devotion",          sanskrit: "भक्तियोग",           concept: "Bhakti & Love",          gradient: "from-purple-950 via-purple-900 to-stone-950" },
  13: { name: "The Field and Its Knower",      sanskrit: "क्षेत्रक्षेत्रज्ञविभागयोग", concept: "Body & Soul",     gradient: "from-fuchsia-950 via-fuchsia-900 to-stone-950" },
  14: { name: "The Three Gunas",               sanskrit: "गुणत्रयविभागयोग",    concept: "Nature's Qualities",     gradient: "from-pink-950 via-pink-900 to-stone-950" },
  15: { name: "The Supreme Person",            sanskrit: "पुरुषोत्तमयोग",      concept: "The Eternal Tree",       gradient: "from-rose-950 via-rose-900 to-stone-950" },
  16: { name: "Divine & Demoniac Natures",     sanskrit: "दैवासुरसम्पद्विभागयोग", concept: "Virtue vs Vice",      gradient: "from-amber-950 via-red-900 to-stone-950" },
  17: { name: "Three Kinds of Faith",          sanskrit: "श्रद्धात्रयविभागयोग", concept: "Faith & Worship",       gradient: "from-emerald-950 via-teal-900 to-stone-950" },
  18: { name: "Liberation Through Renunciation", sanskrit: "मोक्षसंन्यासयोग", concept: "Final Freedom",          gradient: "from-amber-950 via-amber-800 to-stone-950" },
};

interface VerseItem {
  id: string;
  chapter: number;
  verse: number;
  transliteration: string;
  translation_en: string;
  translation_hi: string;
}

export default function ChapterPage() {
  const { chapter } = useParams<{ chapter: string }>();
  const router = useRouter();
  const [verses, setVerses] = useState<VerseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState({ read: 0, total: 0, pct: 0 });

  useEffect(() => {
    if (!chapter) return;
    fetch(`${API_BASE}/api/learn/chapters/${chapter}/verses`)
      .then((r) => r.json())
      .then((data: VerseItem[]) => {
        setVerses(data);
        const map: Record<string, boolean> = {};
        data.forEach((v) => { map[v.id] = isRead(v.id); });
        setReadMap(map);
        setProgress(getChapterProgress(parseInt(chapter)));
      })
      .finally(() => setLoading(false));
  }, [chapter]);

  const readCount = Object.values(readMap).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-sacred">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/learn")}
              className="text-text-secondary hover:text-maroon transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-maroon">Chapter {chapter}</h1>
              <p className="text-xs text-text-secondary">{readCount}/{verses.length} verses read</p>
            </div>
            {/* Lang toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gold/30 flex-shrink-0">
              <button onClick={() => setLang("en")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${lang === "en" ? "bg-saffron text-white" : "text-text-secondary hover:bg-warm-gray"}`}>
                EN
              </button>
              <button onClick={() => setLang("hi")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${lang === "hi" ? "bg-saffron text-white" : "text-text-secondary hover:bg-warm-gray"}`}>
                हि
              </button>
            </div>
          </div>
          {/* Chapter progress bar */}
          <div className="progress-bar mt-2.5">
            <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      </header>

      {/* Chapter hero */}
      {(() => {
        const chNum = parseInt(chapter);
        const info = CHAPTER_INFO[chNum];
        if (!info) return null;
        return (
          <div className={`relative overflow-hidden bg-gradient-to-br ${info.gradient}`}>
            {/* Mandala circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full border border-white/8" />
              <div className="absolute -right-2 top-0 w-32 h-32 rounded-full border border-white/8" />
              <div className="absolute right-8 top-4 w-16 h-16 rounded-full border border-white/10" />
            </div>
            {/* Large chapter number watermark */}
            <span className="absolute right-4 bottom-0 text-9xl font-black text-white/5 select-none leading-none">{chNum}</span>
            {/* OM watermark */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-6xl text-white/5 select-none font-serif">ॐ</span>
            <div className="relative max-w-2xl mx-auto px-6 py-7">
              <p className="text-xs text-white/40 font-medium tracking-widest uppercase mb-1">Chapter {chNum}</p>
              <h2 className="text-xl font-bold text-white mb-1">{info.name}</h2>
              <p className="text-sm text-white/60 font-medium mb-3">{info.sanskrit}</p>
              <span className="inline-block text-xs bg-white/10 text-white/70 px-3 py-1 rounded-full border border-white/15">
                {info.concept}
              </span>
              {progress.read > 0 && (
                <div className="mt-4">
                  <div className="h-1 rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-white/60 transition-all" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <p className="text-xs text-white/40 mt-1.5">{progress.read} of {progress.total} verses read</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {verses.map((v) => {
              const read = readMap[v.id] ?? false;
              return (
                <button key={v.id} onClick={() => router.push(`/learn/verse/${v.id}`)}
                  className={`w-full text-left rounded-2xl card-premium hover-lift cursor-pointer group overflow-hidden ${read ? "border-emerald-200/60" : ""}`}>
                  <div className="p-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      {/* Verse number chip */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-saffron/10 text-xs font-bold text-saffron-dark">
                          {chapter}.{v.verse}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${read ? "badge-read" : "badge-unread"}`}>
                          {read ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {read ? "Read" : "Unread"}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gold/40 group-hover:text-saffron transition-colors flex-shrink-0 mt-1" />
                    </div>

                    {/* Transliteration */}
                    <p className="text-xs text-text-secondary italic line-clamp-1 mb-2 leading-relaxed">
                      {v.transliteration}
                    </p>

                    {/* Translation */}
                    <p className={`text-sm text-text-primary line-clamp-3 leading-relaxed ${lang === "hi" ? "font-medium" : ""}`}>
                      {lang === "en" ? v.translation_en : v.translation_hi}
                    </p>
                  </div>

                  {/* Bottom accent strip */}
                  <div className={`h-0.5 w-full transition-all ${read ? "bg-emerald-400/40" : "bg-gold/0 group-hover:bg-saffron/20"}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline component used above
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
