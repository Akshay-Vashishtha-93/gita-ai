"use client";

import { ThumbsUp, ThumbsDown, Footprints, Lightbulb, HelpCircle, AlertTriangle } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Verse {
  chapter: number;
  verse: number;
  transliteration: string;
  translation: string;
  translation_hi?: string;
  reference: string;
}

interface Structured {
  type: "guidance" | "greeting" | "casual" | "followup" | "safety";
  language?: string;
  // guidance fields
  empathy?: string;
  verse?: Verse;
  insight?: string;
  action?: string;
  reflection?: string;
  safety_note?: string;
  // simple response fields
  response?: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  structured?: Structured;
  messageId?: string;
  userId?: string;
  riskLevel?: string;
}

function KurukshetraScene() {
  return (
    <div className="w-full h-16 overflow-hidden flex-shrink-0">
      <svg viewBox="0 0 400 64" preserveAspectRatio="xMidYMid slice" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Pre-dawn sky */}
        <rect width="400" height="64" fill="#0f0400"/>
        {/* Horizon glow */}
        <ellipse cx="200" cy="64" rx="180" ry="42" fill="#92400e" opacity="0.4"/>
        <ellipse cx="200" cy="64" rx="100" ry="26" fill="#b45309" opacity="0.3"/>
        <ellipse cx="200" cy="64" rx="55" ry="16" fill="#f59e0b" opacity="0.2"/>
        {/* Stars */}
        <circle cx="32" cy="10" r="1" fill="#fde68a" opacity="0.5"/>
        <circle cx="68" cy="6" r="1.3" fill="#fde68a" opacity="0.4"/>
        <circle cx="110" cy="14" r="0.9" fill="#fde68a" opacity="0.35"/>
        <circle cx="155" cy="8" r="1.1" fill="#fde68a" opacity="0.4"/>
        <circle cx="245" cy="11" r="1" fill="#fde68a" opacity="0.45"/>
        <circle cx="290" cy="5" r="1.3" fill="#fde68a" opacity="0.4"/>
        <circle cx="340" cy="16" r="0.9" fill="#fde68a" opacity="0.3"/>
        <circle cx="375" cy="9" r="1" fill="#fde68a" opacity="0.5"/>
        {/* Ground */}
        <rect x="0" y="52" width="400" height="12" fill="#0a0200"/>
        {/* Left horse */}
        <ellipse cx="122" cy="48" rx="20" ry="7" fill="#0a0200" opacity="0.95"/>
        <rect x="112" y="38" width="7" height="14" rx="3.5" fill="#0a0200"/>
        <rect x="120" y="36" width="5" height="6" rx="2.5" fill="#0a0200"/>
        {/* Right horse */}
        <ellipse cx="278" cy="48" rx="20" ry="7" fill="#0a0200" opacity="0.95"/>
        <rect x="278" y="38" width="7" height="14" rx="3.5" fill="#0a0200"/>
        <rect x="272" y="36" width="5" height="6" rx="2.5" fill="#0a0200"/>
        {/* Chariot body */}
        <rect x="155" y="32" width="90" height="22" rx="3" fill="#0a0200"/>
        <line x1="160" y1="37" x2="240" y2="37" stroke="#92400e" strokeWidth="1.5" opacity="0.7"/>
        {/* Left wheel */}
        <circle cx="170" cy="54" r="10" fill="none" stroke="#92400e" strokeWidth="1.8" opacity="0.75"/>
        <circle cx="170" cy="54" r="3.5" fill="#92400e" opacity="0.55"/>
        <line x1="170" y1="44" x2="170" y2="64" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        <line x1="160" y1="54" x2="180" y2="54" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        {/* Right wheel */}
        <circle cx="230" cy="54" r="10" fill="none" stroke="#92400e" strokeWidth="1.8" opacity="0.75"/>
        <circle cx="230" cy="54" r="3.5" fill="#92400e" opacity="0.55"/>
        <line x1="230" y1="44" x2="230" y2="64" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        <line x1="220" y1="54" x2="240" y2="54" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        {/* Flag pole + Hanuman flag */}
        <line x1="197" y1="32" x2="197" y2="10" stroke="#92400e" strokeWidth="1.5" opacity="0.9"/>
        <path d="M197,10 L215,17 L197,24Z" fill="#dc2626" opacity="0.75"/>
        {/* Two figure silhouettes on chariot */}
        <circle cx="183" cy="32" r="5.5" fill="#060100"/>
        <rect x="179" y="32" width="9" height="8" rx="1" fill="#060100"/>
        <circle cx="206" cy="30" r="5.5" fill="#060100"/>
        <rect x="202" y="30" width="9" height="8" rx="1" fill="#060100"/>
        {/* Bow arc suggestion */}
        <path d="M214,25 Q222,30 214,40" fill="none" stroke="#92400e" strokeWidth="1.2" opacity="0.55"/>
        {/* Yoke / reins */}
        <line x1="155" y1="43" x2="140" y2="47" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        <line x1="155" y1="43" x2="137" y2="46" stroke="#92400e" strokeWidth="1" opacity="0.3"/>
        <line x1="245" y1="43" x2="262" y2="47" stroke="#92400e" strokeWidth="1" opacity="0.4"/>
        <line x1="245" y1="43" x2="264" y2="46" stroke="#92400e" strokeWidth="1" opacity="0.3"/>
      </svg>
    </div>
  );
}

function VerseCard({ verse }: { verse: Verse }) {
  const [showHindi, setShowHindi] = useState(false);
  return (
    <div className="relative rounded-2xl overflow-hidden my-3 shadow-lg">
      {/* Sacred background */}
      <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-amber-950 to-stone-900" />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #d4a84b 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      {/* Faint Om watermark */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-8xl text-white/5 select-none pointer-events-none font-serif">ॐ</div>

      {/* Kurukshetra scene illustration */}
      <div className="relative">
        <KurukshetraScene />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-stone-900/80 pointer-events-none" />
      </div>

      <div className="relative px-5 py-4">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">Bhagavad Gita</span>
          <span className="text-amber-600/60 text-xs">·</span>
          <span className="text-amber-500/80 text-xs">{verse.reference}</span>
        </div>

        {/* Transliteration */}
        {verse.transliteration && (
          <p className="text-amber-200 italic text-sm leading-relaxed mb-2 font-medium">
            {verse.transliteration}
          </p>
        )}

        {/* Divider */}
        <div className="w-12 h-px bg-amber-600/40 mb-3" />

        {/* Translation */}
        <p className="text-amber-50 text-sm leading-relaxed">
          {showHindi && verse.translation_hi ? verse.translation_hi : verse.translation}
        </p>

        {/* Toggle Hindi */}
        {verse.translation_hi && (
          <button
            onClick={() => setShowHindi(!showHindi)}
            className="mt-3 text-xs text-amber-500/70 hover:text-amber-400 transition-colors cursor-pointer"
          >
            {showHindi ? "English ↗" : "हिंदी में देखें ↗"}
          </button>
        )}
      </div>
    </div>
  );
}

function GuidanceCard({ structured, content }: { structured: Structured; content: string }) {
  if (!structured.empathy && !structured.verse && !structured.insight) {
    // Fallback: just render the plain text
    return (
      <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Empathy */}
      {structured.empathy && (
        <p className="text-gray-700 text-sm leading-relaxed pb-3 border-b border-amber-100">
          {structured.empathy}
        </p>
      )}

      {/* Verse card */}
      {structured.verse && <VerseCard verse={structured.verse} />}

      {/* Insight */}
      {structured.insight && (
        <div className="flex gap-3 pt-3 pb-3 border-b border-amber-50">
          <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">What this means for you</p>
            <p className="text-sm text-gray-700 leading-relaxed">{structured.insight}</p>
          </div>
        </div>
      )}

      {/* Action */}
      {structured.action && (
        <div className="flex gap-3 pt-3 pb-3 border-b border-amber-50">
          <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Footprints className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">One thing to do today</p>
            <p className="text-sm text-gray-700 leading-relaxed">{structured.action}</p>
          </div>
        </div>
      )}

      {/* Reflection */}
      {structured.reflection && (
        <div className="flex gap-3 pt-3">
          <div className="w-7 h-7 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <HelpCircle className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Reflect on this</p>
            <p className="text-sm text-gray-600 leading-relaxed italic">{structured.reflection}</p>
          </div>
        </div>
      )}

      {/* Safety note */}
      {structured.safety_note && (
        <div className="flex gap-2 mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">{structured.safety_note}</p>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ role, content, structured, messageId, userId }: MessageBubbleProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const isUser = role === "user";

  async function handleFeedback(type: "helpful" | "not_helpful") {
    if (!userId || !messageId || feedback) return;
    setFeedback(type);
    try {
      await submitFeedback({ user_id: userId, message_id: messageId, feedback_type: type });
    } catch { /* non-critical */ }
  }

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[78%] bg-gradient-to-br from-amber-700 to-orange-800 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  // Determine if we have structured guidance or a simple response
  const isGuidance = structured?.type === "guidance";
  const simpleText = structured?.response || content;

  return (
    <div className="flex justify-start mb-5">
      <div className="max-w-[92%] md:max-w-[82%]">
        {/* Avatar row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold" style={{ fontFamily: "serif" }}>ॐ</span>
          </div>
          <span className="text-xs font-medium text-amber-700">GitaAI</span>
        </div>

        <div className="bg-white rounded-2xl rounded-tl-sm border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            {isGuidance && structured ? (
              <GuidanceCard structured={structured} content={content} />
            ) : (
              <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                <ReactMarkdown>{simpleText}</ReactMarkdown>
              </div>
            )}
          </div>

          {messageId && userId && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/60 border-t border-amber-50">
              <span className="text-xs text-gray-400 flex-1">Was this helpful?</span>
              <button onClick={() => handleFeedback("helpful")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${feedback === "helpful" ? "text-green-600 bg-green-100" : "text-gray-300 hover:text-green-500"}`}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleFeedback("not_helpful")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${feedback === "not_helpful" ? "text-red-500 bg-red-100" : "text-gray-300 hover:text-red-400"}`}>
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
