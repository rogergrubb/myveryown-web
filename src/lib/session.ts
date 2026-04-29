// ════════════════════════════════════════════════════════════════
// SESSION + SHARED-THREAD MESSAGE STORAGE
// ════════════════════════════════════════════════════════════════
// Post-2026-04-26: ONE conversation thread per user/session, persisted
// in localStorage so it survives persona switches, tab reloads, and
// route changes. Each assistant message is stamped with the persona
// who spoke. Switching personas changes the active VOICE — never the
// thread.
// ════════════════════════════════════════════════════════════════

const KEYS = {
  // Session anchors (one anonymous session per browser, even before name)
  sessionId: 'mvo:sessionId',
  sessionInitialPersona: 'mvo:sessionPersona',     // first persona chosen on /start (kept for backwards compat)
  sessionName: 'mvo:sessionName',
  sessionExpires: 'mvo:sessionExpires',

  // Shared thread
  messages: 'mvo:messages',
  currentPersona: 'mvo:currentPersona',            // who's responding right now

  // Auth
  authToken: 'mvo:token',
  user: 'mvo:user',
};

export type LocalSession = {
  sessionId: string;
  /** First persona the user picked (mostly historical). The active voice lives in `currentPersona`. */
  persona: string;
  name: string | null;
  expiresAt: number;
};

export type LocalUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
  /** For assistant messages: which persona spoke. Undefined for user messages. */
  persona?: string;
  /** Epoch ms — used for ordering + future "session timeline" UX. */
  ts?: number;
};

// ─────── Session anchor ────────────────────────────────────────

export function saveSession(s: LocalSession) {
  localStorage.setItem(KEYS.sessionId, s.sessionId);
  localStorage.setItem(KEYS.sessionInitialPersona, s.persona);
  localStorage.setItem(KEYS.sessionName, s.name || '');
  localStorage.setItem(KEYS.sessionExpires, String(s.expiresAt));
  // First call also seeds the active voice if not already set
  if (!localStorage.getItem(KEYS.currentPersona)) {
    localStorage.setItem(KEYS.currentPersona, s.persona);
  }
}

export function getSession(): LocalSession | null {
  const id = localStorage.getItem(KEYS.sessionId);
  if (!id) return null;
  return {
    sessionId: id,
    persona: localStorage.getItem(KEYS.sessionInitialPersona) || 'kpop',
    name: localStorage.getItem(KEYS.sessionName) || null,
    expiresAt: Number(localStorage.getItem(KEYS.sessionExpires) || 0),
  };
}

export function clearSession() {
  localStorage.removeItem(KEYS.sessionId);
  localStorage.removeItem(KEYS.sessionInitialPersona);
  localStorage.removeItem(KEYS.sessionName);
  localStorage.removeItem(KEYS.sessionExpires);
  localStorage.removeItem(KEYS.messages);
  localStorage.removeItem(KEYS.currentPersona);
}

// ─────── Active voice (current persona) ────────────────────────

export function getCurrentPersona(): string {
  return localStorage.getItem(KEYS.currentPersona)
    || localStorage.getItem(KEYS.sessionInitialPersona)
    || 'kpop';
}

export function setCurrentPersona(personaId: string) {
  localStorage.setItem(KEYS.currentPersona, personaId);
}

// ─────── Shared message thread ─────────────────────────────────

export function getMessages(): StoredMessage[] {
  const raw = localStorage.getItem(KEYS.messages);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: StoredMessage[]) {
  // Cap to last 200 messages to keep localStorage small. Older context
  // continues to live in Cortex memory on the backend.
  const tail = messages.slice(-200);
  try {
    localStorage.setItem(KEYS.messages, JSON.stringify(tail));
  } catch {
    // QuotaExceeded — drop half and retry once
    try {
      localStorage.setItem(KEYS.messages, JSON.stringify(tail.slice(-100)));
    } catch { /* give up */ }
  }
}

export function clearMessages() {
  localStorage.removeItem(KEYS.messages);
}

// ─────── Auth ──────────────────────────────────────────────────

export function saveAuth(token: string, user: LocalUser) {
  localStorage.setItem(KEYS.authToken, token);
  localStorage.setItem(KEYS.user, JSON.stringify(user));
}

export function getAuth(): { token: string; user: LocalUser } | null {
  const token = localStorage.getItem(KEYS.authToken);
  const userStr = localStorage.getItem(KEYS.user);
  if (!token || !userStr) return null;
  try { return { token, user: JSON.parse(userStr) }; }
  catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem(KEYS.authToken);
  localStorage.removeItem(KEYS.user);
}

// ─────── Time helpers ──────────────────────────────────────────

export function timeLeftMs(expiresAt: number): number {
  return Math.max(0, expiresAt - Date.now());
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'expired';
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hrs >= 1) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}
