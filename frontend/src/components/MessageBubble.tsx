"use client";

import ReactMarkdown from "react-markdown";
import { ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  userId?: string;
  riskLevel?: string;
}

// Extract verse block: lines starting with "> " (blockquote = verse)
function parseVerseBlock(content: string): { pre: string; verse: string; post: string } | null {
  const lines = content.split("\n");
  const verseStart = lines.findIndex((l) => l.startsWith("> "));
  if (verseStart === -1) return null;
  let verseEnd = verseStart;
  while (verseEnd + 1 < lines.length && (lines[verseEnd + 1].startsWith("> ") || lines[verseEnd + 1].trim() === "")) {
    verseEnd++;
  }
  // include "— Chapter X, Verse Y" line right after if present
  if (verseEnd + 1 < lines.length && lines[verseEnd + 1].startsWith("— ")) verseEnd++;
  return {
    pre: lines.slice(0, verseStart).join("\n").trim(),
    verse: lines.slice(verseStart, verseEnd + 1).join("\n"),
    post: lines.slice(verseEnd + 1).join("\n").trim(),
  };
}

function VerseCard({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.replace(/^> /, "").trim()).filter(Boolean);
  const ref = lines.find((l) => l.startsWith("— "));
  const body = lines.filter((l) => !l.startsWith("— "));
  return (
    <div className="my-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Gita Verse</span>
      </div>
      <div className="space-y-1">
        {body.map((line, i) => {
          const clean = line.replace(/\*\*/g, "").replace(/\*/g, "");
          const isTransliteration = i === 0 && !line.startsWith('"');
          const isTranslation = line.startsWith('"') || line.startsWith("&quot;");
          return (
            <p
              key={i}
              className={
                isTransliteration
                  ? "text-sm italic text-amber-800 font-medium"
                  : isTranslation
                  ? "text-sm text-gray-800 font-medium"
                  : "text-sm text-gray-700"
              }
            >
              {clean}
            </p>
          );
        })}
      </div>
      {ref && (
        <p className="mt-2 text-xs text-amber-600 font-medium">{ref}</p>
      )}
    </div>
  );
}

export default function MessageBubble({
  role,
  content,
  messageId,
  userId,
}: MessageBubbleProps) {
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
        <div className="max-w-[80%] md:max-w-[65%] bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  // Assistant message — parse verse block if present
  const parsed = parseVerseBlock(content);

  return (
    <div className="flex justify-start mb-5">
      <div className="max-w-[90%] md:max-w-[80%]">
        {/* Avatar */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
            ॐ
          </div>
          <span className="text-xs text-amber-700 font-medium">GitaAI</span>
        </div>

        <div className="bg-white border border-amber-100 rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-1">
            {parsed ? (
              <>
                {parsed.pre && (
                  <div className="prose prose-sm text-gray-800 max-w-none mb-2 leading-relaxed">
                    <ReactMarkdown>{parsed.pre}</ReactMarkdown>
                  </div>
                )}
                <VerseCard text={parsed.verse} />
                {parsed.post && (
                  <div className="prose prose-sm text-gray-800 max-w-none mt-2 leading-relaxed">
                    <ReactMarkdown>{parsed.post}</ReactMarkdown>
                  </div>
                )}
              </>
            ) : (
              <div className="prose prose-sm text-gray-800 max-w-none leading-relaxed">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>

          {messageId && userId && (
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-amber-50 bg-amber-50/40 mt-1">
              <span className="text-xs text-gray-400 flex-1">Was this helpful?</span>
              <button
                onClick={() => handleFeedback("helpful")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  feedback === "helpful" ? "text-green-600 bg-green-100" : "text-gray-300 hover:text-green-500 hover:bg-green-50"
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFeedback("not_helpful")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  feedback === "not_helpful" ? "text-red-500 bg-red-100" : "text-gray-300 hover:text-red-400 hover:bg-red-50"
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
