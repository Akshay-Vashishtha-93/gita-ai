"use client";

import ReactMarkdown from "react-markdown";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  userId?: string;
  riskLevel?: string;
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
      await submitFeedback({
        user_id: userId,
        message_id: messageId,
        feedback_type: type,
      });
    } catch {
      // silently fail — feedback is non-critical
    }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-saffron text-white rounded-br-md"
            : "bg-white border border-gold/20 rounded-bl-md shadow-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose text-text-primary text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Feedback buttons for assistant messages */}
        {!isUser && messageId && userId && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gold/10">
            <span className="text-xs text-text-secondary mr-1">
              Was this helpful?
            </span>
            <button
              onClick={() => handleFeedback("helpful")}
              className={`p-1 rounded transition-colors cursor-pointer ${
                feedback === "helpful"
                  ? "text-green-600 bg-green-50"
                  : "text-text-secondary hover:text-green-600"
              }`}
              aria-label="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback("not_helpful")}
              className={`p-1 rounded transition-colors cursor-pointer ${
                feedback === "not_helpful"
                  ? "text-red-500 bg-red-50"
                  : "text-text-secondary hover:text-red-500"
              }`}
              aria-label="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
