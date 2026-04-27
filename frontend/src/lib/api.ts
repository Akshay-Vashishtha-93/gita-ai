const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  age: number;
  gender: string | null;
  location: string | null;
  preferred_language: string;
  life_stage_id: string | null;
  gita_familiarity: string;
}

export interface ChatResponse {
  response: string;
  structured?: Record<string, unknown>;
  session_id: string;
  message_id: string;
  verse_ids: string[];
  risk_level: string;
  messages_used: number;
  messages_remaining: number;
}

export interface LifeStage {
  id: string;
  name: string;
  description: string;
  age_lower: number;
  age_upper: number;
}

export async function createUser(data: {
  email?: string;
  display_name?: string;
  age: number;
  gender?: string;
  location?: string;
  preferred_language?: string;
  gita_familiarity?: string;
}): Promise<{ user_id: string; life_stage: LifeStage; message: string }> {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginUser(email: string): Promise<{ user_id: string; display_name: string | null; age: number }> {
  return request("/api/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getUser(userId: string): Promise<UserProfile> {
  return request(`/api/users/${userId}`);
}

export async function sendMessage(data: {
  message: string;
  user_id: string;
  session_id?: string;
}): Promise<ChatResponse> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface Chapter {
  chapter: number;
  name: string;
  description: string;
}

export interface VerseItem {
  id: string;
  chapter: number;
  verse: number;
  transliteration: string;
  translation_en: string;
}

export interface LifeStage {
  id: string;
  name: string;
  description: string;
  age_lower: number;
  age_upper: number;
}

export interface VerseInterpretation {
  verse: Record<string, unknown>;
  life_stage: LifeStage;
  interpretation: string;
}

export async function getChapters(): Promise<Chapter[]> {
  return request("/api/learn/chapters");
}

export async function getChapterVerses(chapter: number): Promise<VerseItem[]> {
  return request(`/api/learn/chapters/${chapter}/verses`);
}

export async function getVerseInterpretation(
  verseId: string,
  lifeStage?: string
): Promise<VerseInterpretation> {
  const qs = lifeStage ? `?life_stage=${lifeStage}` : "";
  return request(`/api/learn/verses/${verseId}/interpret${qs}`);
}

export async function submitFeedback(data: {
  user_id: string;
  message_id?: string;
  verse_id?: string;
  feedback_type: string;
  comment?: string;
}): Promise<{ feedback_id: string; status: string }> {
  return request("/api/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
