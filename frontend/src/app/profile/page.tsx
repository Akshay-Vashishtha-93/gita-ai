"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, BookOpen, LogOut, ChevronRight } from "lucide-react";
import { getOverallProgress, getChapterProgress, CHAPTER_VERSE_COUNTS } from "@/lib/progress";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Session { id: string; created_at: string; first_message: string | null; risk_level: string; }
interface User { id: string; display_name: string | null; age: number; life_stage_id: string | null; gita_familiarity: string; email: string | null; }

const LIFE_STAGE_LABELS: Record<string, string> = {
  CHILD: "Child", STUDENT: "Student", YOUNG_PROFESSIONAL: "Young Professional",
  HOUSEHOLDER: "Householder", PARENT: "Parent", MIDLIFE: "Midlife",
  ELDER: "Elder / Vanaprastha",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState({ read: 0, total: 701, pct: 0 });
  const [chapProgress, setChapProgress] = useState<Record<number, { read: number; total: number; pct: number }>>({});

  useEffect(() => {
    const uid = localStorage.getItem("gitaai_user_id");
    if (!uid) { router.push("/onboarding"); return; }

    // Overall reading progress
    setOverall(getOverallProgress());
    const cp: Record<number, { read: number; total: number; pct: number }> = {};
    for (let i = 1; i <= 18; i++) cp[i] = getChapterProgress(i);
    setChapProgress(cp);

    // Fetch user + sessions
    Promise.all([
      fetch(`${API_BASE}/api/users/${uid}`).then(r => r.json()),
      fetch(`${API_BASE}/api/users/${uid}/sessions?limit=20`).then(r => r.json()),
    ]).then(([u, s]) => {
      setUser(u);
      setSessions(s.filter((x: Session) => x.first_message));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  function logout() {
    localStorage.removeItem("gitaai_user_id");
    localStorage.removeItem("gitaai_session_id");
    router.push("/");
  }

  function resumeSession(id: string) {
    localStorage.setItem("gitaai_session_id", id);
    router.push("/chat");
  }

  const chaptersStarted = Object.values(chapProgress).filter(c => c.read > 0).length;
  const chaptersCompleted = Object.values(chapProgress).filter(c => c.pct === 100).length;

  if (loading) return (
    <div className="min-h-screen bg-sacred flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-sacred">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-text-secondary hover:text-maroon transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-maroon flex-1">My Profile</h1>
          <button onClick={logout} className="flex items-center gap-1 text-xs text-text-secondary hover:text-red-500 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* User card */}
        <div className="card-premium rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-2xl shadow-md" style={{ fontFamily: "serif" }}>ॐ</div>
            <div>
              <p className="font-bold text-maroon text-lg">{user?.display_name || "Seeker"}</p>
              {user?.email && <p className="text-xs text-text-secondary">{user.email}</p>}
              <div className="flex items-center gap-2 mt-1">
                {user?.age && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{user.age} years</span>}
                {user?.life_stage_id && <span className="text-xs bg-maroon/10 text-maroon px-2 py-0.5 rounded-full">{LIFE_STAGE_LABELS[user.life_stage_id] || user.life_stage_id}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { n: sessions.length, label: "Conversations" },
            { n: chaptersStarted, label: "Chapters started" },
            { n: chaptersCompleted, label: "Chapters completed" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center border border-gold/20 shadow-sm">
              <p className="text-2xl font-bold text-saffron">{s.n}</p>
              <p className="text-xs text-text-secondary mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Reading progress */}
        <div className="bg-white rounded-2xl p-5 border border-gold/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-saffron" />
              <p className="font-semibold text-maroon">Gita Reading Progress</p>
            </div>
            <span className="text-lg font-bold text-saffron">{overall.pct}%</span>
          </div>
          <div className="progress-bar mb-2">
            <div className="progress-fill" style={{ width: `${overall.pct}%` }} />
          </div>
          <p className="text-xs text-text-secondary">{overall.read} of {overall.total} verses read</p>

          {/* Chapter breakdown (only started ones) */}
          {chaptersStarted > 0 && (
            <div className="mt-4 space-y-2">
              {Object.entries(chapProgress)
                .filter(([, p]) => p.read > 0)
                .map(([ch, p]) => (
                  <div key={ch} className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-16 flex-shrink-0">Chapter {ch}</span>
                    <div className="flex-1 h-1.5 bg-gold/15 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-saffron/70 transition-all" style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary w-10 text-right">{p.pct}%</span>
                  </div>
                ))}
              <button onClick={() => router.push("/learn")} className="text-xs text-saffron hover:text-saffron-dark mt-2 block cursor-pointer">
                Continue reading →
              </button>
            </div>
          )}

          {chaptersStarted === 0 && (
            <button onClick={() => router.push("/learn")}
              className="mt-3 w-full text-sm text-center text-saffron hover:text-saffron-dark border border-saffron/30 hover:border-saffron/60 py-2 rounded-lg transition-colors cursor-pointer">
              Start reading the Gita →
            </button>
          )}
        </div>

        {/* Chat history */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gold/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gold/10">
              <MessageCircle className="w-4 h-4 text-saffron" />
              <p className="font-semibold text-maroon">Conversations</p>
            </div>
            <div className="divide-y divide-gold/10">
              {sessions.map(s => (
                <button key={s.id} onClick={() => resumeSession(s.id)}
                  className="w-full text-left px-5 py-3.5 hover:bg-amber-50/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-1">{s.first_message}</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gold group-hover:text-saffron flex-shrink-0 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
