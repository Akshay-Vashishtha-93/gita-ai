"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, BookOpen, History, ChevronRight, Star } from "lucide-react";
import { getOverallProgress, TOTAL_VERSES } from "@/lib/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Session {
  id: string;
  created_at: string;
  first_message: string | null;
}

function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(184,150,60,0.15)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#ring-grad)" strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E07B18" />
          <stop offset="100%" stopColor="#B8963C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [hasUser, setHasUser] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState({ read: 0, total: TOTAL_VERSES, pct: 0 });

  useEffect(() => {
    const uid = localStorage.getItem("gitaai_user_id");
    if (uid) {
      setHasUser(true);
      setUserId(uid);
      fetch(`${API_BASE}/api/users/${uid}/sessions?limit=3`)
        .then((r) => r.json())
        .then((data) => setRecentSessions(data.filter((s: Session) => s.first_message)))
        .catch(() => {});
    }
    setProgress(getOverallProgress());
  }, []);

  function continueSession(sessionId: string) {
    localStorage.setItem("gitaai_session_id", sessionId);
    router.push("/chat");
  }

  function startNewChat() {
    localStorage.removeItem("gitaai_session_id");
    router.push(hasUser ? "/chat" : "/onboarding");
  }

  return (
    <div className="min-h-screen bg-sacred flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl text-saffron" aria-hidden>&#x0950;</span>
          <span className="font-bold text-maroon text-lg tracking-wide">GitaAI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/learn")}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-maroon px-3 py-1.5 rounded-lg hover:bg-white/60 transition-all cursor-pointer">
            <BookOpen className="w-4 h-4" /> Learn
          </button>
          {hasUser && (
            <button onClick={() => router.push("/history")}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-maroon px-3 py-1.5 rounded-lg hover:bg-white/60 transition-all cursor-pointer">
              <History className="w-4 h-4" /> History
            </button>
          )}
          <button onClick={startNewChat}
            className="flex items-center gap-1.5 text-sm bg-maroon hover:bg-maroon-light text-white px-4 py-1.5 rounded-lg transition-colors cursor-pointer ml-1">
            <MessageCircle className="w-4 h-4" />
            {hasUser ? "Ask Gita" : "Get Started"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-12 pb-16 text-center max-w-3xl mx-auto w-full flex-1">

        {/* Hero image strip — abstract spiritual gradient panels */}
        <div className="relative w-full max-w-xl h-48 rounded-3xl overflow-hidden mb-10 shadow-xl">
          {/* Multi-panel gradient as "image" */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-maroon to-amber-950" />
          <div className="absolute inset-0 bg-gradient-to-tr from-saffron/30 via-transparent to-gold/20" />
          {/* Decorative circles evoking mandala */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-64 h-64 rounded-full border border-gold/10" />
            <div className="absolute w-48 h-48 rounded-full border border-gold/15" />
            <div className="absolute w-32 h-32 rounded-full border border-gold/20" />
            <div className="absolute w-16 h-16 rounded-full border border-gold/30" />
          </div>
          {/* Central Om */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl text-white/90 drop-shadow-lg" style={{ fontFamily: "serif" }}>&#x0950;</span>
          </div>
          {/* Subtle lotus petal hints */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60 tracking-widest uppercase">
            Bhagavad Gita · श्रीमद्भगवद्गीता
          </p>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-maroon mb-4 leading-tight tracking-tight">
          Ancient Wisdom.<br />
          <span className="text-saffron">Personally Yours.</span>
        </h1>
        <p className="text-base text-text-secondary max-w-md mb-10 leading-relaxed">
          Share a dilemma, a struggle, or a question. Receive guidance from the Bhagavad Gita —
          interpreted for your age, your context, your life.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <button onClick={startNewChat}
            className="group flex items-center gap-2 bg-maroon hover:bg-maroon-light text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer">
            <MessageCircle className="w-5 h-5" />
            {hasUser ? "Continue Your Journey" : "Begin Your Journey"}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button onClick={() => router.push("/learn")}
            className="flex items-center gap-2 bg-white/80 hover:bg-white border border-gold/30 text-maroon font-medium px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
            <BookOpen className="w-5 h-5 text-saffron" />
            Explore the Gita
          </button>
        </div>

        {/* Reading progress (if user has read anything) */}
        {progress.read > 0 && (
          <div className="w-full max-w-sm bg-white/80 border border-gold/20 rounded-2xl p-4 mb-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ProgressRing pct={progress.pct} size={56} />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-saffron">
                  {progress.pct}%
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">Your Gita Journey</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {progress.read} of {progress.total} verses read
                </p>
                <div className="progress-bar mt-2">
                  <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="w-full max-w-md">
            <div className="divider-gold mb-5" />
            <p className="text-xs uppercase tracking-widest text-text-secondary mb-3">Recent conversations</p>
            <div className="space-y-2">
              {recentSessions.map((s) => (
                <button key={s.id} onClick={() => continueSession(s.id)}
                  className="w-full text-left px-4 py-3 rounded-xl card-premium hover-lift cursor-pointer group">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-text-primary line-clamp-1 flex-1">{s.first_message}</p>
                    <ChevronRight className="w-4 h-4 text-gold flex-shrink-0 group-hover:text-saffron transition-colors" />
                  </div>
                  <p className="text-xs text-text-secondary/50 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </button>
              ))}
              <button onClick={() => router.push("/history")}
                className="w-full text-center text-xs text-text-secondary hover:text-maroon py-2 cursor-pointer">
                View all →
              </button>
            </div>
          </div>
        )}

        {hasUser && (
          <button onClick={() => {
            localStorage.removeItem("gitaai_user_id");
            localStorage.removeItem("gitaai_session_id");
            setHasUser(false); setUserId(null); setRecentSessions([]);
          }} className="mt-8 text-xs text-text-secondary/40 hover:text-text-secondary underline cursor-pointer">
            Start fresh
          </button>
        )}
      </section>

      {/* Stats strip */}
      <section className="border-t border-gold/15 bg-white/50 py-8 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "700", label: "Verses" },
            { n: "18", label: "Chapters" },
            { n: "22", label: "Commentators" },
            { n: "7", label: "Life Stages" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-saffron">{s.n}</p>
              <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-4 text-xs text-text-secondary/40">
        Built with reverence for the Bhagavad Gita
      </footer>
    </div>
  );
}
