"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { getChapters, type Chapter } from "@/lib/api";
import { getChapterProgress, getOverallProgress, TOTAL_VERSES } from "@/lib/progress";

const CHAPTER_GRADIENTS = [
  "from-rose-900 via-rose-800 to-rose-950",
  "from-amber-900 via-amber-800 to-yellow-950",
  "from-orange-900 via-orange-800 to-amber-950",
  "from-yellow-800 via-yellow-700 to-amber-900",
  "from-emerald-900 via-emerald-800 to-teal-950",
  "from-teal-900 via-teal-800 to-cyan-950",
  "from-cyan-900 via-cyan-800 to-sky-950",
  "from-sky-900 via-sky-800 to-blue-950",
  "from-blue-900 via-blue-800 to-indigo-950",
  "from-indigo-900 via-indigo-800 to-violet-950",
  "from-violet-900 via-violet-800 to-purple-950",
  "from-purple-900 via-purple-800 to-fuchsia-950",
  "from-fuchsia-900 via-fuchsia-800 to-pink-950",
  "from-pink-900 via-pink-800 to-rose-950",
  "from-rose-900 via-red-800 to-orange-950",
  "from-amber-800 via-orange-700 to-yellow-900",
  "from-emerald-800 via-teal-700 to-cyan-900",
  "from-maroon via-maroon-light to-rose-950",
];

export default function LearnPage() {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterProgress, setChapterProgress] = useState<Record<number, { read: number; total: number; pct: number }>>({});
  const [overall, setOverall] = useState({ read: 0, total: TOTAL_VERSES, pct: 0 });

  useEffect(() => {
    getChapters().then((chs) => {
      setChapters(chs);
      const prog: Record<number, { read: number; total: number; pct: number }> = {};
      chs.forEach((ch) => { prog[ch.chapter] = getChapterProgress(ch.chapter); });
      setChapterProgress(prog);
    }).finally(() => setLoading(false));
    setOverall(getOverallProgress());
  }, []);

  return (
    <div className="min-h-screen bg-sacred">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="text-text-secondary hover:text-maroon transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-maroon text-lg">Bhagavad Gita</h1>
            <p className="text-xs text-text-secondary">18 Chapters · 701 Verses</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Overall progress card */}
        <div className="card-premium rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-maroon">Your Progress</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {overall.read} of {overall.total} verses read
              </p>
            </div>
            <span className="text-2xl font-bold text-saffron">{overall.pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${overall.pct}%` }} />
          </div>
          {overall.pct === 100 && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> You have read the entire Bhagavad Gita!
            </p>
          )}
        </div>

        {/* Chapter intro */}
        <p className="text-sm text-text-secondary mb-6 text-center max-w-lg mx-auto">
          Explore each chapter, read every verse, and discover what it means at your stage of life.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chapters.map((ch) => {
              const prog = chapterProgress[ch.chapter] ?? { read: 0, total: 0, pct: 0 };
              const grad = CHAPTER_GRADIENTS[(ch.chapter - 1) % CHAPTER_GRADIENTS.length];
              const done = prog.pct === 100;
              return (
                <button key={ch.chapter} onClick={() => router.push(`/learn/chapter/${ch.chapter}`)}
                  className="relative w-full text-left rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                  {/* Subtle mandala circles */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full border border-white/10" />
                    <div className="absolute -right-2 -top-2 w-20 h-20 rounded-full border border-white/10" />
                  </div>
                  {/* Large chapter number watermark */}
                  <span className="absolute right-3 bottom-2 text-8xl font-black text-white/8 select-none leading-none">
                    {ch.chapter}
                  </span>
                  {/* Content */}
                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs text-white/50 font-medium mb-1">Chapter {ch.chapter}</p>
                        <p className="font-bold text-white text-sm leading-snug">{ch.name}</p>
                      </div>
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : prog.read > 0 ? (
                        <span className="text-xs text-white/60 flex-shrink-0 mt-0.5">{prog.read}/{prog.total}</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed line-clamp-2 mb-4">
                      {ch.description}
                    </p>
                    {/* Progress bar */}
                    <div className="h-1 rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-white/70 transition-all"
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-white/40">{prog.total} verses</p>
                      <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors flex items-center gap-1">
                        Explore <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
