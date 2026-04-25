"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Home, History, Plus } from "lucide-react";
import { sendMessage } from "@/lib/api";
import MessageBubble from "@/components/MessageBubble";
import SafetyBanner from "@/components/SafetyBanner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  riskLevel?: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Namaste. Share a dilemma, struggle, or question you're carrying — something that's been on your mind. The more specific you are about your situation, the more relevant the guidance will be.\n\nWhat's weighing on you?",
};

const PROMPT_SUGGESTIONS = [
  "I'm stuck between what my parents want and what I want for myself",
  "I keep comparing myself to people my age and feel like I'm falling behind",
  "I've lost someone close to me and don't know how to move forward",
  "I'm angry at someone who hurt me but can't let it go",
];

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSafety, setShowSafety] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load user + restore session history
  useEffect(() => {
    const storedUserId = localStorage.getItem("gitaai_user_id");
    if (!storedUserId) {
      router.push("/onboarding");
      return;
    }
    setUserId(storedUserId);

    // Pre-fill from learn page "Ask GitaAI" button
    const draft = localStorage.getItem("gitaai_draft_message");
    if (draft) {
      setInput(draft);
      localStorage.removeItem("gitaai_draft_message");
    }

    const storedSessionId = localStorage.getItem("gitaai_session_id");
    if (storedSessionId) {
      setSessionId(storedSessionId);
      // Load previous messages
      fetch(`${API_BASE}/api/sessions/${storedSessionId}/messages`)
        .then((r) => r.json())
        .then((rows: { id: string; role: string; content: string }[]) => {
          if (rows.length > 0) {
            const restored: Message[] = rows.map((r) => ({
              id: r.id,
              role: r.role as "user" | "assistant",
              content: r.content,
              messageId: r.role === "assistant" ? r.id : undefined,
            }));
            setMessages(restored);
          } else {
            setMessages([WELCOME_MESSAGE]);
          }
        })
        .catch(() => setMessages([WELCOME_MESSAGE]))
        .finally(() => setLoadingHistory(false));
    } else {
      setMessages([WELCOME_MESSAGE]);
      setLoadingHistory(false);
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading || !userId) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const result = await sendMessage({
        message: msg,
        user_id: userId,
        session_id: sessionId || undefined,
      });

      if (result.session_id) {
        setSessionId(result.session_id);
        localStorage.setItem("gitaai_session_id", result.session_id);
      }

      if (["high", "immediate", "moderate"].includes(result.risk_level)) {
        setShowSafety(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.response,
          messageId: result.message_id,
          riskLevel: result.risk_level,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            err instanceof Error
              ? `I'm having trouble connecting. ${err.message}`
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  const isFirstMessage = messages.length <= 1 && messages[0]?.id === "welcome";

  if (loadingHistory) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-saffron" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gold/20 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => router.push("/")}
          className="text-text-secondary hover:text-maroon transition-colors cursor-pointer"
          aria-label="Home"
        >
          <Home className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-maroon text-lg">GitaAI</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/history")}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-maroon transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={() => {
              setMessages([WELCOME_MESSAGE]);
              setSessionId(null);
              localStorage.removeItem("gitaai_session_id");
            }}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-maroon transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {showSafety && <SafetyBanner />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              messageId={msg.messageId}
              userId={userId!}
              riskLevel={msg.riskLevel}
            />
          ))}

          {/* Prompt suggestions — only on fresh chat */}
          {isFirstMessage && !loading && (
            <div className="mt-4 space-y-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="w-full text-left px-4 py-2.5 text-sm rounded-xl border border-gold/30 bg-white hover:border-saffron/50 hover:bg-saffron/5 text-text-secondary transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gold/20 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Seeking wisdom...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gold/20 bg-white/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Share a dilemma or question you're carrying..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gold/30 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-saffron/40 text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-saffron hover:bg-saffron-dark text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-text-secondary/60 mt-2 max-w-2xl mx-auto">
          GitaAI provides spiritual guidance, not professional advice.
        </p>
      </div>
    </div>
  );
}
