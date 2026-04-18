const KEYS = {
  sessionId: 'mvo:sessionId',
  sessionPersona: 'mvo:sessionPersona',
  sessionName: 'mvo:sessionName',
  sessionExpires: 'mvo:sessionExpires',
  authToken: 'mvo:token',
  user: 'mvo:user',
};

export type LocalSession = {
  sessionId: string;
  persona: string;
  name: string | null;
  expiresAt: number;
};

export type LocalUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export function saveSession(s: LocalSession) {
  localStorage.setItem(KEYS.sessionId, s.sessionId);
  localStorage.setItem(KEYS.sessionPersona, s.persona);
  localStorage.setItem(KEYS.sessionName, s.name || '');
  localStorage.setItem(KEYS.sessionExpires, String(s.expiresAt));
}

export function getSession(): LocalSession | null {
  const id = localStorage.getItem(KEYS.sessionId);
  if (!id) return null;
  return {
    sessionId: id,
    persona: localStorage.getItem(KEYS.sessionPersona) || 'kpop',
    name: localStorage.getItem(KEYS.sessionName) || null,
    expiresAt: Number(localStorage.getItem(KEYS.sessionExpires) || 0),
  };
}

export function clearSession() {
  localStorage.removeItem(KEYS.sessionId);
  localStorage.removeItem(KEYS.sessionPersona);
  localStorage.removeItem(KEYS.sessionName);
  localStorage.removeItem(KEYS.sessionExpires);
}

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
