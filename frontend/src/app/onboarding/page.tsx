"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, loginUser } from "@/lib/api";
import { ArrowRight, Loader2 } from "lucide-react";

const FAMILIARITY_OPTIONS = [
  { value: "NEVER_READ", label: "Never read it" },
  { value: "HEARD_OF", label: "Heard of it, know some shlokas" },
  { value: "READ_PARTIALLY", label: "Read parts of it" },
  { value: "READ_FULLY", label: "Read the whole Gita" },
  { value: "STUDY_REGULARLY", label: "Study it regularly" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "new" | "login">("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [familiarity, setFamiliarity] = useState("NEVER_READ");
  const [loginEmail, setLoginEmail] = useState("");

  async function handleLogin() {
    if (!loginEmail.trim()) { setError("Please enter your email"); return; }
    setLoading(true); setError("");
    try {
      const result = await loginUser(loginEmail.trim().toLowerCase());
      localStorage.setItem("gitaai_user_id", result.user_id);
      localStorage.removeItem("gitaai_session_id");
      router.push("/");
    } catch {
      setError("No account found with this email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 10 || ageNum > 100) { setError("Please enter a valid age (10–100)"); return; }
    setLoading(true); setError("");
    try {
      const result = await createUser({
        email: email.trim().toLowerCase() || undefined,
        display_name: name || undefined,
        age: ageNum,
        gender: gender || undefined,
        gita_familiarity: familiarity,
      });
      localStorage.setItem("gitaai_user_id", result.user_id);
      localStorage.removeItem("gitaai_session_id");
      router.push("/chat");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("email_exists") ? "This email is already registered. Use 'Continue your journey' to log in." : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-sacred">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-800 flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-xl" style={{ fontFamily: "serif" }}>ॐ</div>
          <h1 className="text-3xl font-bold text-maroon mb-2">GitaAI</h1>
          <p className="text-text-secondary text-sm mb-10">Ancient wisdom for your modern life</p>
          <div className="space-y-3">
            <button onClick={() => setMode("new")}
              className="w-full flex items-center justify-center gap-2 bg-maroon hover:bg-maroon-light text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg transition-all cursor-pointer">
              Begin your journey <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setMode("login")}
              className="w-full border border-gold/40 hover:border-saffron/60 text-maroon font-medium px-6 py-3.5 rounded-xl transition-colors cursor-pointer">
              Continue your journey
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-sacred">
        <div className="w-full max-w-sm">
          <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-text-secondary hover:text-maroon mb-6 block">← Back</button>
          <h2 className="text-2xl font-bold text-maroon mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-6">Enter the email you signed up with</p>
          <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="your@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40 mb-4" />
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-maroon text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-sacred">
      <div className="w-full max-w-md">
        <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-text-secondary hover:text-maroon mb-6 block">← Back</button>
        <h2 className="text-2xl font-bold text-maroon mb-1">Tell us about yourself</h2>
        <p className="text-sm text-text-secondary mb-7">This personalises the Gita's guidance for your life stage</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email <span className="text-text-secondary font-normal">(optional — saves your progress across devices)</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Name <span className="text-text-secondary font-normal">(optional)</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?"
              className="w-full px-4 py-2.5 rounded-xl border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Age <span className="text-maroon">*</span></label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Your age" min={10} max={100}
              className="w-full px-4 py-2.5 rounded-xl border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gender <span className="text-text-secondary font-normal">(optional)</span></label>
            <div className="flex gap-2">
              {["Male", "Female", "Other"].map((g) => (
                <button key={g} onClick={() => setGender(g.toLowerCase())}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${gender === g.toLowerCase() ? "border-saffron bg-saffron/10 text-saffron-dark" : "border-gold/30 hover:border-saffron/50"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">How familiar are you with the Bhagavad Gita?</label>
            <div className="space-y-2">
              {FAMILIARITY_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setFamiliarity(opt.value)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${familiarity === opt.value ? "border-saffron bg-saffron/10 text-saffron-dark" : "border-gold/30 hover:border-saffron/50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-8 flex items-center justify-center gap-2 bg-maroon hover:bg-maroon-light text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg transition-colors disabled:opacity-50 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Seeking Wisdom <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
