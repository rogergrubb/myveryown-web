const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string; status: number };

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = localStorage.getItem('mvo:token');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text }; }
  if (!res.ok) return { ok: false, error: body.error || 'Request failed', code: body.code, status: res.status };
  return { ok: true, data: body as T };
}

// ═══════════════════════════════════════
// SESSION
// ═══════════════════════════════════════
export async function createSession(persona: string, name?: string, ageVerified?: boolean) {
  return request<{ sessionId: string; expiresAt: number; persona: string; name: string | null }>(
    '/api/session', { method: 'POST', body: JSON.stringify({ persona, name, ageVerified: !!ageVerified }) }
  );
}

export async function getSession(id: string) {
  return request<{
    sessionId: string; name: string | null; persona: string;
    messageCount: number; expiresAt: number; expired: boolean; userId: string | null;
  }>(`/api/session/${id}`);
}

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
export async function sendMagicLink(email: string, sessionId?: string) {
  return request<{ ok: boolean; message: string }>('/api/auth/magic-link', {
    method: 'POST', body: JSON.stringify({ email, sessionId }),
  });
}

export async function verifyMagicToken(token: string) {
  return request<{ token: string; user: { id: string; email: string; displayName: string | null } }>(
    '/api/auth/magic-link/verify', { method: 'POST', body: JSON.stringify({ token }) }
  );
}

export async function loginGoogle(idToken: string, sessionId?: string) {
  return request<{ token: string; user: { id: string; email: string; displayName: string | null } }>(
    '/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken, sessionId }) }
  );
}

export async function getMe() {
  return request<{ user: { id: string; email: string; displayName: string | null } }>('/api/auth/me');
}

// ═══════════════════════════════════════
// CHAT — streaming SSE
// ═══════════════════════════════════════
export type ChatChunk =
  | { type: 'chunk'; text: string }
  | { type: 'done'; usage: any; messageCount: number }
  | { type: 'error'; message: string };

export async function* streamChat(
  sessionId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  persona?: string,           // post-2026-04-26 — voice for this turn
  threadMode?: 'isolated' | 'shared',  // post-2026-04-29 — memory namespace mode
): AsyncGenerator<ChatChunk, void, unknown> {
  const token = localStorage.getItem('mvo:token');
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      sessionId,
      messages,
      ...(persona ? { persona } : {}),
      ...(threadMode ? { thread_mode: threadMode } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Stream failed' }));
    yield { type: 'error', message: err.error || 'Stream failed' };
    if (err.code === 'SESSION_EXPIRED') throw new Error('SESSION_EXPIRED');
    if (err.code === 'NEEDS_SUBSCRIPTION') throw new Error('NEEDS_SUBSCRIPTION');
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)) as ChatChunk; } catch {}
      }
    }
  }
}

// ═══════════════════════════════════════
// SUBSCRIBE
// ═══════════════════════════════════════
export async function startCheckout(persona: string, cadence: 'monthly' | 'annual') {
  return request<{ url: string; sessionId: string }>('/api/subscribe/checkout', {
    method: 'POST', body: JSON.stringify({ persona, cadence }),
  });
}

// ═══════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════
export async function getPersonas() {
  return request<{ personas: any[] }>('/api/personas');
}


// ─── Image generation (MVP) ────────────────────────────────────────
// POST /api/image/generate — Gemini's image-capable variants.
// Returns a base64 data URL. Counts as a message turn for trial accounting.

export type ImageGenResult = {
  ok: true;
  dataUrl: string;
  mimeType: string;
  bytes: number;
  model: string;
  caption: string | null;
  messageCount: number;
};

export type ImageGenError = Error & {
  code?: string;
  status?: number;
  payload?: any;            // server response body — carries upgrade offer for IMAGE_LIMIT_DAILY
};

export async function generateImage(
  sessionId: string,
  persona: string,
  prompt: string,
): Promise<ImageGenResult> {
  const token = localStorage.getItem('mvo:token');
  const res = await fetch(`${API_URL}/api/image/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sessionId, persona, prompt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Image generation failed' }));
    const e = new Error(body.error || `HTTP ${res.status}`) as ImageGenError;
    e.code = body.code;
    e.status = res.status;
    e.payload = body;
    throw e;
  }
  return await res.json() as ImageGenResult;
}
