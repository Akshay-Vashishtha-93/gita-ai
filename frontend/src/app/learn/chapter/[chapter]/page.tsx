"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { getChapterProgress, isRead } from "@/lib/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
