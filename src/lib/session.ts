// ════════════════════════════════════════════════════════════════
// SESSION + PER-PERSONA MESSAGE STORAGE (v2: 2026-04-29)
// ════════════════════════════════════════════════════════════════
// Each persona gets its own thread by default. Scarlet's late-night
// conversation doesn't leak into Iron Brother's workout context.
//
// Two modes (toggle in chat header):
//   - 'isolated' (DEFAULT): each persona has its own private thread.
//   - 'shared' : one merged thread visible across all 20 personas.
//
// Storage layout:
//   mvo:thread-mode      → 'isolated' | 'shared'
//   mvo:messages:<id>    → StoredMessage[] for persona <id>
//   mvo:messages         → LEGACY single-thread store (only used in shared mode
//                          AND for one-time migration to per-persona buckets)
// ════════════════════════════════════════════════════════════════

const KEYS = {
  // Session anchors (one anonymous session per browser, even before name)
  sessionId: 'mvo:sessionId',
  sessionInitialPersona: 'mvo:sessionPersona',     // first persona chosen on /start
  sessionName: 'mvo:sessionName',
  sessionExpires: 'mvo:sessionExpires',

  // Threads
  threadMode: 'mvo:thread-mode',                   // 'isolated' | 'shared'
  messagesLegacy: 'mvo:messages',                  // pre-v2 single thread store
  messagesPrefix: 'mvo:messages:',                 // per-persona bucket prefix
  currentPersona: 'mvo:currentPersona',            // who's responding right now

  // Auth
  authToken: 'mvo:token',
  user: 'mvo:user',
};

export type ThreadMode = 'isolated' | 'shared';

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
  /** For assistant messages: which persona spoke. Undefined for user messages in legacy data. */
  persona?: string;
  /** Epoch ms — used for ordering across per-persona buckets in shared-merge view. */
  ts?: number;
  /** Optional inline image (base64 data URL). Only present in-session — stripped on save to avoid blowing localStorage quota. */
  image?: { dataUrl: string; alt: string };
};

// ─────── Session anchor ────────────────────────────────────────

export function saveSession(s: LocalSession) {
  localStorage.setItem(KEYS.sessionId, s.sessionId);
  localStorage.setItem(KEYS.sessionInitialPersona, s.persona);
  localStorage.setItem(KEYS.sessionName, s.name || '');
  localStorage.setItem(KEYS.sessionExpires, String(s.expiresAt));
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
  localStorage.removeItem(KEYS.messagesLegacy);
  localStorage.removeItem(KEYS.currentPersona);
  localStorage.removeItem(KEYS.threadMode);
  // Clear per-persona buckets too
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEYS.messagesPrefix)) localStorage.removeItem(k);
  }
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

// ─────── Thread mode ──────────────────────────────────────────

export function getThreadMode(): ThreadMode {
  // Migration: if the user has legacy mvo:messages but no mvo:thread-mode,
  // they've never seen the toggle. Default them to 'isolated' (the new
  // default) and split their existing messages into per-persona buckets.
  const stored = localStorage.getItem(KEYS.threadMode) as ThreadMode | null;
  if (stored === 'isolated' || stored === 'shared') return stored;
  // First time: migrate any legacy data, then default to isolated.
  migrateLegacyToBuckets();
  localStorage.setItem(KEYS.threadMode, 'isolated');
  return 'isolated';
}

export function setThreadMode(mode: ThreadMode) {
  localStorage.setItem(KEYS.threadMode, mode);
}

// ─────── Per-persona buckets ──────────────────────────────────

function readBucket(personaId: string): StoredMessage[] {
  const raw = localStorage.getItem(KEYS.messagesPrefix + personaId);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeBucket(personaId: string, msgs: StoredMessage[]) {
  // Cap each bucket at 200 messages. Strip image dataUrls before persisting —
  // base64 images would blow the 5MB localStorage quota fast. We replace the
  // image field with a small marker so future renders can show 'image was here'
  // without keeping the bytes around.
  const tail = msgs.slice(-200).map(m => {
    if (!m.image) return m;
    return { ...m, image: { dataUrl: '', alt: m.image.alt || 'image' } };
  });
  try {
    localStorage.setItem(KEYS.messagesPrefix + personaId, JSON.stringify(tail));
  } catch {
    try {
      localStorage.setItem(KEYS.messagesPrefix + personaId, JSON.stringify(tail.slice(-100)));
    } catch { /* give up */ }
  }
}

/**
 * Walk a flat message list and split into per-persona buckets.
 * Each user message gets attributed to the persona of the assistant
 * that responds to it. Trailing/leading user messages without a
 * matching assistant get attributed to the supplied default persona.
 */
function splitByPersona(messages: StoredMessage[], defaultPersona: string): Record<string, StoredMessage[]> {
  const buckets: Record<string, StoredMessage[]> = {};
  let pendingUser: StoredMessage | null = null;
  let lastPersona = defaultPersona;

  for (const msg of messages) {
    if (msg.role === 'user') {
      pendingUser = msg;
      continue;
    }
    // assistant
    const personaId = msg.persona || lastPersona;
    lastPersona = personaId;
    if (!buckets[personaId]) buckets[personaId] = [];
    if (pendingUser) {
      buckets[personaId].push(pendingUser);
      pendingUser = null;
    }
    buckets[personaId].push(msg);
  }
  // Dangling user message — attribute to last persona seen (or default)
  if (pendingUser) {
    if (!buckets[lastPersona]) buckets[lastPersona] = [];
    buckets[lastPersona].push(pendingUser);
  }
  return buckets;
}

/**
 * One-time migration: if mvo:messages (legacy) has data and no buckets exist
 * yet, split it into per-persona buckets. The legacy key is then deleted.
 */
function migrateLegacyToBuckets() {
  const raw = localStorage.getItem(KEYS.messagesLegacy);
  if (!raw) return;
  let legacy: StoredMessage[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) legacy = parsed;
  } catch { return; }
  if (legacy.length === 0) return;
  const buckets = splitByPersona(legacy, getCurrentPersona());
  for (const [id, msgs] of Object.entries(buckets)) {
    // Don't clobber a bucket that already has data
    if (readBucket(id).length === 0) writeBucket(id, msgs);
  }
  // Keep the legacy key for one toggle cycle so users who flip to 'shared'
  // immediately can still see their original linear thread. It'll get
  // overwritten or cleared by clearSession() / clearMessages().
}

/** Iterate through all per-persona buckets in localStorage. */
function listAllBucketIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEYS.messagesPrefix)) {
      ids.push(k.slice(KEYS.messagesPrefix.length));
    }
  }
  return ids;
}

// ─────── Public messages API ──────────────────────────────────

/**
 * Load messages for the current viewing context.
 * - isolated mode (default) → only the current persona's bucket
 * - shared mode → all buckets merged + sorted by timestamp
 */
export function getMessages(): StoredMessage[] {
  const mode = getThreadMode();
  if (mode === 'shared') {
    const all: StoredMessage[] = [];
    for (const id of listAllBucketIds()) {
      all.push(...readBucket(id));
    }
    all.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return all.slice(-200);
  }
  // isolated
  return readBucket(getCurrentPersona());
}

/**
 * Save messages. Splits by attributed persona so per-persona buckets
 * are always the source of truth, regardless of which mode the user
 * is currently viewing.
 */
export function saveMessages(messages: StoredMessage[]) {
  const buckets = splitByPersona(messages, getCurrentPersona());
  for (const [id, msgs] of Object.entries(buckets)) {
    writeBucket(id, msgs);
  }
  // Stamp current timestamps on any messages without one (helps merge sort
  // in shared mode). Not reading-back-and-rewriting older messages — only
  // the latest-saved batch gets stamped if they're missing ts.
}

/** Clear messages for the current persona only (or all if shared mode). */
export function clearMessages() {
  if (getThreadMode() === 'shared') {
    for (const id of listAllBucketIds()) {
      localStorage.removeItem(KEYS.messagesPrefix + id);
    }
    localStorage.removeItem(KEYS.messagesLegacy);
  } else {
    localStorage.removeItem(KEYS.messagesPrefix + getCurrentPersona());
  }
}

// ─────── Per-persona presence helpers ─────────────────────────

/**
 * Latest message timestamp for the given persona's bucket, or null if
 * no messages have been exchanged yet. Used to render the 'around · 2h ago'
 * presence subtext in the chat header.
 */
export function getLastVisitTs(personaId: string): number | null {
  const msgs = readBucket(personaId);
  if (msgs.length === 0) return null;
  // Walk from the end, return the first ts we find.
  for (let i = msgs.length - 1; i >= 0; i--) {
    const t = msgs[i].ts;
    if (typeof t === 'number' && Number.isFinite(t)) return t;
  }
  return null;
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
