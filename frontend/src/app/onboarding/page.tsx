"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, loginUser } from "@/lib/api";
import { ArrowRight, Loader2, BookOpen } from "lucide-react";

const FAMILIARITY_OPTIONS = [
  { value: "NEVER_READ", label: "Never read it" },
  { value: "HEARD_OF", label: "Heard of it, know some shlokas" },
  { value: "READ_PARTIALLY", label: "Read parts of it" },
  { value: "READ_FULLY", label: "Read the whole Gita" },
  { value: "STUDY_REGULARLY", label: "Study it regularly" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "new" | "login">("choose");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // New user fields
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("en");
  const [familiarity, setFamiliarity] = useState("NEVER_READ");

  // Login
  const [loginEmail, setLoginEmail] = useState("");

  async function handleLogin() {
    if (!loginEmail.trim()) { setError("Please enter your email"); return; }
    setLoading(true); setError("");
    try {
      const result = await loginUser(loginEmail.trim().toLowerCase());
      localStorage.setItem("gitaai_user_id", result.user_id);
      localStorage.removeItem("gitaai_session_id");
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("not_found") ? "No account found with this email." : "Something went wrong.");
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
        preferred_language: language,
        gita_familiarity: familiarity,
      });
      localStorage.setItem("gitaai_user_id", result.user_id);
      localStorage.removeItem("gitaai_session_id");
      router.push("/chat");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("email_exists")) {
        setError("This email is already registered. Use 'Continue your journey' to log in.");
      } else {
        setError(msg || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Choose screen ──
  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-sacred">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-3xl mx-auto shadow-lg">
            ॐ
          </div>
          <div>
            <h1 className="text-2xl font-bold text-maroon">GitaAI</h1>
            <p className="text-sm text-text-secondary mt-1">Ancient wisdom for modern life</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setMode("new")}
              className="w-full flex items-center justify-center gap-2 bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              Begin your journey <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode("login")}
              className="w-full flex items-center justify-center gap-2 border border-gold/40 hover:border-saffron/60 text-maroon font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Continue your journey
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login screen ──
  if (mode === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-sacred">
        <div className="w-full max-w-sm">
          <button onClick={() => { setMode("choose"); setError(""); }} className="text-sm text-text-secondary hover:text-maroon mb-6 block">← Back</button>
          <h2 className="text-2xl font-bold text-maroon mb-1">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-6">Enter the email you registered with</p>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40 mb-4"
          />
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
          </button>
        </div>
      </div>
    );
  }

  // ── New user steps ──
  const steps = [
    <div key="basics" className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-maroon">Begin your journey</h2>
        <p className="text-sm text-text-secondary mt-1">Tell us about yourself for personalised guidance</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Email <span className="text-text-secondary">(optional — to save progress)</span></label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Name <span className="text-text-secondary">(optional)</span></label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Age <span className="text-maroon">*</span></label>
        <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
          placeholder="Your age" min={10} max={100}
          className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Gender <span className="text-text-secondary">(optional)</span></label>
        <div className="flex gap-3">
          {["Male", "Female", "Other"].map((g) => (
            <button key={g} onClick={() => setGender(g.toLowerCase())}
              className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer text-sm ${gender === g.toLowerCase() ? "border-saffron bg-saffron/10 text-saffron-dark" : "border-gold/30 hover:border-saffron/50"}`}>
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>,

    <div key="prefs" className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-maroon">Your preferences</h2>
        <p className="text-sm text-text-secondary mt-1">We'll personalise the Gita's wisdom for you</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Preferred language</label>
        <div className="flex gap-3">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setLanguage(opt.value)}
              className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer text-sm ${language === opt.value ? "border-saffron bg-saffron/10 text-saffron-dark" : "border-gold/30 hover:border-saffron/50"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">How familiar are you with the Bhagavad Gita?</label>
        <div className="space-y-2">
          {FAMILIARITY_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setFamiliarity(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer text-sm ${familiarity === opt.value ? "border-saffron bg-saffron/10 text-saffron-dark" : "border-gold/30 hover:border-saffron/50"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-sacred">
      <div className="w-full max-w-md">
        <button onClick={() => { setMode("choose"); setStep(0); setError(""); }} className="text-sm text-text-secondary hover:text-maroon mb-6 block">← Back</button>
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-saffron" : "bg-gold/20"}`} />
          ))}
        </div>

        {steps[step]}

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-text-secondary hover:text-maroon transition-colors cursor-pointer text-sm">Back</button>
          ) : <div />}

          {step < steps.length - 1 ? (
            <button
              onClick={() => {
                if (!age || parseInt(age) < 10 || parseInt(age) > 100) { setError("Please enter a valid age (10–100)"); return; }
                setError(""); setStep(step + 1);
              }}
              className="flex items-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Seeking Wisdom"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
