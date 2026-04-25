"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Session {
  id: string;
  created_at: string;
  risk_level: string;
  first_message: string | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = localStorage.getItem("gitaai_user_id");
    if (!uid) { router.push("/onboarding"); return; }

    fetch(`${API_BASE}/api/users/${uid}/sessions?limit=20`)
      .then((r) => r.json())
      .then((data) => setSessions(data.filter((s: Session) => s.first_message)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function openSession(sessionId: string) {
    localStorage.setItem("gitaai_session_id", sessionId);
    router.push("/chat");
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="min-h-screen bg-sacred">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gold/20 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="text-text-secondary hover:text-maroon transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-maroon">Your Conversations</h1>
          <p className="text-xs text-text-secondary">Pick up where you left off</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("gitaai_session_id");
            router.push("/chat");
          }}
          className="flex items-center gap-1.5 text-xs bg-saffron text-white px-3 py-1.5 rounded-lg hover:bg-saffron-dark transition-colors cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          New Chat
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-warm-gray animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-30">&#x0950;</div>
            <p className="text-text-secondary">No conversations yet.</p>
            <button
              onClick={() => { localStorage.removeItem("gitaai_session_id"); router.push("/chat"); }}
              className="mt-4 text-saffron hover:text-saffron-dark underline text-sm cursor-pointer"
            >
              Start your first conversation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s.id)}
                className="w-full text-left px-4 py-4 rounded-xl card-premium hover-glow transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary line-clamp-2 leading-relaxed">
                      {s.first_message}
                    </p>
                    <p className="text-xs text-text-secondary/60 mt-1.5">
                      {formatDate(s.created_at)}
                      {s.risk_level && s.risk_level !== "none" && (
                        <span className="ml-2 text-amber-600">• Sensitive topic</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gold flex-shrink-0 mt-1 group-hover:text-saffron transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
