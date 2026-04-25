"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api";
import { ArrowRight, Loader2 } from "lucide-react";

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
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("en");
  const [familiarity, setFamiliarity] = useState("NEVER_READ");

  async function handleSubmit() {
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 10 || ageNum > 100) {
      setError("Please enter a valid age (10-100)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createUser({
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
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    // Step 0: Name + Age
    <div key="basics" className="space-y-6">
      <h2 className="text-2xl font-bold text-maroon">Tell us about yourself</h2>
      <p className="text-text-secondary">
        This helps us personalize the Gita&apos;s wisdom for your life stage.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Name <span className="text-text-secondary">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Age <span className="text-maroon">*</span>
        </label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Your age"
          min={10}
          max={100}
          className="w-full px-4 py-2.5 rounded-lg border border-gold/30 bg-white focus:outline-none focus:ring-2 focus:ring-saffron/40"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Gender <span className="text-text-secondary">(optional)</span>
        </label>
        <div className="flex gap-3">
          {["Male", "Female", "Other"].map((g) => (
            <button
              key={g}
              onClick={() => setGender(g.toLowerCase())}
              className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                gender === g.toLowerCase()
                  ? "border-saffron bg-saffron/10 text-saffron-dark"
                  : "border-gold/30 hover:border-saffron/50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Language + Familiarity
    <div key="prefs" className="space-y-6">
      <h2 className="text-2xl font-bold text-maroon">Your preferences</h2>

      <div>
        <label className="block text-sm font-medium mb-2">
          Preferred language
        </label>
        <div className="flex gap-3">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className={`px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                language === opt.value
                  ? "border-saffron bg-saffron/10 text-saffron-dark"
                  : "border-gold/30 hover:border-saffron/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          How familiar are you with the Bhagavad Gita?
        </label>
        <div className="space-y-2">
          {FAMILIARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFamiliarity(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                familiarity === opt.value
                  ? "border-saffron bg-saffron/10 text-saffron-dark"
                  : "border-gold/30 hover:border-saffron/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-saffron" : "bg-gold/20"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {steps[step]}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-text-secondary hover:text-maroon transition-colors cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => {
                if (!age || parseInt(age) < 10 || parseInt(age) > 100) {
                  setError("Please enter a valid age (10-100)");
                  return;
                }
                setError("");
                setStep(step + 1);
              }}
              className="flex items-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-maroon hover:bg-maroon-light text-white font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Start Seeking Wisdom"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
