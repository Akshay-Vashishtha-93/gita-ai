"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Loader2, BookOpen } from "lucide-react";
import { getDailyVerse, type DailyVerse } from "@/lib/api";

export default function DailyVersePage() {
  const router = useRouter();
  const [data, setData] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "hi">("en");

  useEffect(() => {
    const userId = localStorage.getItem("gitaai_user_id") || undefined;
    getDailyVerse(userId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function askAboutVerse() {
    if (!data) return;
    const v = data.verse as Record<string, string | number>;
    const msg = `I was reading today's daily verse — Chapter ${v.chapter}, Verse ${v.verse}: "${String(v.translation_en).slice(0, 120)}..." — can you help me understand how this applies to my life?`;
    localStorage.setItem("gitaai_draft_message", msg);
    router.push("/chat");
  }

  const verse = data?.verse as Record<string, string | number> | undefined;

  return (
    <div className="min-h-screen bg-sacred">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="text-text-secondary hover:text-maroon transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-maroon">Daily Verse</h1>
            {data?.date && <p className="text-xs text-text-secondary">{data.date}</p>}
          </div>
          <button onClick={() => router.push("/learn")}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-maroon px-2 py-1.5 rounded-lg hover:bg-white/60 transition-all cursor-pointer">
            <BookOpen className="w-4 h-4" /> Learn
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-saffron" />
            <p className="text-sm text-text-secondary">Preparing today&apos;s verse...</p>
          </div>
        ) : !verse ? (
          <div className="text-center py-20 text-text-secondary">
            <p>Could not load today&apos;s verse. Please try again.</p>
          </div>
        ) : (
          <>
            {/* Sanskrit card */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-maroon via-maroon-light to-amber-950" />
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full border border-white/8" />
                <div className="absolute -right-3 -top-3 w-28 h-28 rounded-full border border-white/8" />
                <div className="absolute -left-4 -bottom-4 w-28 h-28 rounded-full border border-white/8" />
              </div>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-2 text-8xl text-white/5 select-none font-serif pointer-events-none">ॐ</span>
              <div className="relative p-6 text-center">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-4">
                  Chapter {verse.chapter} · Verse {verse.verse}
                </p>
                {verse.sanskrit && (
                  <p className="text-base text-white/90 leading-loose mb-4" style={{ fontFamily: "serif" }}>
                    {String(verse.sanskrit)}
                  </p>
                )}
                <div className="h-px bg-white/15 mb-4" />
                <p className="text-xs text-white/50 italic leading-relaxed">
                  {String(verse.transliteration || "")}
                </p>
              </div>
            </div>

            {/* Translation */}
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
                {lang === "en" ? String(verse.translation_en || "") : String(verse.translation_hi || verse.translation_en || "")}
              </p>
            </div>

            {/* Daily reflection */}
            {data?.interpretation && (
              <div className="card-premium rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-saffron/15 flex items-center justify-center">
                    <span className="text-saffron text-xs font-bold" style={{ fontFamily: "serif" }}>ॐ</span>
                  </div>
                  <p className="text-xs font-semibold text-saffron-dark uppercase tracking-wide">
                    Today&apos;s Reflection
                    {data.life_stage && (
                      <span className="ml-2 font-normal text-text-secondary normal-case tracking-normal">
                        for the {data.life_stage.name}
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{data.interpretation}</p>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-maroon/5 to-saffron/5 border border-gold/20 p-5 text-center">
              <p className="text-sm text-text-secondary mb-3">
                Want to explore how this verse speaks to your specific situation?
              </p>
              <button onClick={askAboutVerse}
                className="flex items-center gap-2 mx-auto bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer">
                <MessageCircle className="w-4 h-4" /> Discuss with GitaAI
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
