// ════════════════════════════════════════════════════════════════
// DASHBOARD — internal stats/admin view
// ════════════════════════════════════════════════════════════════
// Password-gated by VITE_DASHBOARD_PASS env var (set in Vercel env).
// IMPORTANT: this is NOT real authentication. Vite bakes VITE_-prefixed
// env vars into the client bundle at build time, so the "password" is
// visible to anyone who decompiles the JS. For a stats-only view this
// is fine (worst case: someone sees event counts), but DO NOT gate
// anything sensitive with this. For real admin access, route through
// the magic-link auth → JWT → server-side check pattern.
//
// What it shows:
//   - Live event stream (the analytics shim fires CustomEvents on the
//     window; we listen and accumulate them per-session)
//   - Per-event counters
//   - Persona switch matrix (from→to heatmap)
//   - Persona session state (active persona, message count, time left,
//     localStorage size)
//   - Quick links to managed surfaces (Vercel, GitHub, Stripe, Cortex)
// ════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { PERSONAS } from '../lib/personas';
import * as sess from '../lib/session';
import './Dashboard.css';

const STORAGE_KEY = 'mvo:dashboard-unlocked';
const EVENTS_TO_TRACK = [
  'mvo:persona_switch',
  'mvo:persona_picker_open',
  'mvo:message_sent',
  'mvo:intro_tour',
] as const;

type EventLogEntry = {
  ts: number;
  name: string;
  detail: any;
};

export function Dashboard() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [tick, setTick] = useState(0);   // forces re-render for time displays

  // Listen to analytics events fired by the shim
  useEffect(() => {
    if (!unlocked) return;
    const handlers: Array<[string, EventListener]> = EVENTS_TO_TRACK.map(name => {
      const handler = ((e: CustomEvent) => {
        setEvents(prev => [
          { ts: Date.now(), name: name.replace('mvo:', ''), detail: e.detail || {} },
          ...prev,
        ].slice(0, 200));
      }) as EventListener;
      window.addEventListener(name, handler);
      return [name, handler];
    });
    return () => {
      for (const [name, handler] of handlers) {
        window.removeEventListener(name, handler);
      }
    };
  }, [unlocked]);

  // Tick every 2s to refresh "time ago" labels
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2000);
    return () => clearInterval(t);
  }, []);

  function tryUnlock() {
    const expected = (import.meta.env.VITE_DASHBOARD_PASS as string | undefined) || '999999999';
    if (pw === expected) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPw('');
    }
  }

  function lock() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setUnlocked(false);
  }

  // ─── Locked screen ───────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="dash-lock">
        <div className="dash-lock-card">
          <div className="dash-lock-glyph">🔒</div>
          <h1>Dashboard</h1>
          <p>Enter the gate.</p>
          <input
            autoFocus
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError(false); }}
            onKeyDown={e => { if (e.key === 'Enter') tryUnlock(); }}
            placeholder="••••••••••"
            className={pwError ? 'dash-lock-input dash-lock-input-error' : 'dash-lock-input'}
          />
          <button className="dash-lock-btn" onClick={tryUnlock}>Unlock</button>
          {pwError && <div className="dash-lock-error">Nope.</div>}
          <div className="dash-lock-note">
            Stats only. Not real auth — see Dashboard.tsx header.
          </div>
        </div>
      </div>
    );
  }

  // ─── Derived: per-event counts ───────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events) c[e.name] = (c[e.name] || 0) + 1;
    return c;
  }, [events]);

  const switchMatrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const e of events) {
      if (e.name !== 'persona_switch') continue;
      const from = e.detail.from || '?';
      const to = e.detail.to || '?';
      m[from] = m[from] || {};
      m[from][to] = (m[from][to] || 0) + 1;
    }
    return m;
  }, [events]);

  // ─── Session state (this browser) ────────────────────────────
  const local = sess.getSession();
  const auth = sess.getAuth();
  const messages = sess.getMessages();
  const currentPersona = sess.getCurrentPersona();
  const persona = PERSONAS.find(p => p.id === currentPersona) || PERSONAS[0];

  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="dash">
      <header className="dash-top">
        <div>
          <div className="dash-top-eyebrow">myveryown.page · admin</div>
          <h1 className="dash-top-title">Dashboard</h1>
        </div>
        <div className="dash-top-actions">
          <button className="dash-link" onClick={() => window.open('https://vercel.com/roger-grubbs-projects-2e0adcba/myveryown-web', '_blank')}>Vercel ↗</button>
          <button className="dash-link" onClick={() => window.open('https://github.com/rogergrubb/myveryown-web', '_blank')}>GitHub ↗</button>
          <button className="dash-link" onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}>Stripe ↗</button>
          <button className="dash-lock-out" onClick={lock} title="Lock dashboard">⎙ lock</button>
        </div>
      </header>

      <div className="dash-grid">
        {/* Event counters */}
        <section className="dash-card">
          <h2>Live events <span className="dash-pill">{events.length} this session</span></h2>
          <div className="dash-counters">
            <Counter label="Tour shown/skipped/completed" value={counts['intro_tour'] || 0} />
            <Counter label="Picker opens" value={counts['persona_picker_open'] || 0} />
            <Counter label="Persona switches" value={counts['persona_switch'] || 0} />
            <Counter label="Messages sent" value={counts['message_sent'] || 0} />
          </div>
          <p className="dash-card-note">
            Counts here = events fired in THIS browser since you opened the dashboard.
            For account-wide / production-wide numbers, wire Vercel Analytics
            (script tag in index.html). The analytics shim auto-routes to it.
          </p>
        </section>

        {/* Active session */}
        <section className="dash-card">
          <h2>Your session</h2>
          {local ? (
            <table className="dash-table">
              <tbody>
                <tr><td>Session ID</td><td><code>{local.sessionId}</code></td></tr>
                <tr><td>Name</td><td>{local.name || <em>—</em>}</td></tr>
                <tr><td>Active voice</td><td><span style={{ color: persona.accent }}>● {persona.name}</span></td></tr>
                <tr><td>Initial persona</td><td>{local.persona}</td></tr>
                <tr><td>Messages in thread</td><td>{messages.length}</td></tr>
                <tr><td>Trial expires</td><td>{sess.formatTimeLeft(sess.timeLeftMs(local.expiresAt))}</td></tr>
                <tr><td>Authenticated</td><td>{auth ? `Yes — ${auth.user.email}` : <em>No (anonymous)</em>}</td></tr>
              </tbody>
            </table>
          ) : (
            <p className="dash-card-note">No local session yet. Visit <a href="/">/</a> and pick a persona to start one.</p>
          )}
        </section>

        {/* Persona switch matrix */}
        <section className="dash-card dash-card-wide">
          <h2>Persona switches (from → to)</h2>
          {Object.keys(switchMatrix).length === 0 ? (
            <p className="dash-card-note">No switches yet this session. Use the picker on the chat page.</p>
          ) : (
            <div className="dash-matrix-wrap">
              <table className="dash-matrix">
                <thead>
                  <tr>
                    <th></th>
                    {PERSONAS.map(p => (
                      <th key={p.id} title={p.name} style={{ color: p.accent }}>{p.id.slice(0, 3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERSONAS.map(from => {
                    const row = switchMatrix[from.id];
                    if (!row) return null;
                    return (
                      <tr key={from.id}>
                        <th title={from.name} style={{ color: from.accent }}>{from.id.slice(0, 3)}</th>
                        {PERSONAS.map(to => {
                          const v = row[to.id] || 0;
                          return (
                            <td
                              key={to.id}
                              className={v > 0 ? 'dash-cell-hit' : ''}
                              title={`${from.name} → ${to.name}: ${v}`}
                              style={v > 0 ? { backgroundColor: `rgba(${to.accentRgb}, ${Math.min(0.7, 0.15 + v * 0.15)})` } : undefined}
                            >
                              {v || ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Live event log */}
        <section className="dash-card dash-card-wide">
          <h2>Event log <span className="dash-pill-mini">last 200</span></h2>
          {events.length === 0 ? (
            <p className="dash-card-note">No events yet. Open the chat page in another tab and start poking buttons.</p>
          ) : (
            <ul className="dash-events">
              {events.slice(0, 50).map((e, i) => (
                <li key={i} className={`dash-event dash-event-${e.name}`}>
                  <span className="dash-event-time">{timeAgo(e.ts)}</span>
                  <span className="dash-event-name">{e.name.replace(/_/g, ' ')}</span>
                  <span className="dash-event-detail">
                    {Object.entries(e.detail).map(([k, v]) => (
                      <span key={k} className="dash-event-prop"><b>{k}</b>={String(v)}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Distribution surfaces / quick links */}
        <section className="dash-card">
          <h2>Distribution kit</h2>
          <p className="dash-card-note">
            Launch posts and copy live in <code>/launch-posts/</code> in your project folder.
            Marketing kit (Product Hunt, IndieHackers, Reddit threads) in <code>/marketing/</code>.
          </p>
          <ul className="dash-links">
            <li><a href="https://producthunt.com/" target="_blank" rel="noopener">Product Hunt ↗</a></li>
            <li><a href="https://indiehackers.com/" target="_blank" rel="noopener">IndieHackers ↗</a></li>
            <li><a href="https://reddit.com/r/SideProject" target="_blank" rel="noopener">r/SideProject ↗</a></li>
            <li><a href="https://reddit.com/r/InternetIsBeautiful" target="_blank" rel="noopener">r/InternetIsBeautiful ↗</a></li>
            <li><a href="https://news.ycombinator.com/submit" target="_blank" rel="noopener">HN — Show HN ↗</a></li>
          </ul>
        </section>
      </div>

      <footer className="dash-foot">
        <span>Built {tick * 0 ? '' : ''}{new Date().toLocaleString()}</span>
        <span>· {PERSONAS.length} personas live</span>
        <span>· repo: <a href="https://github.com/rogergrubb/myveryown-web" target="_blank" rel="noopener">myveryown-web</a></span>
      </footer>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="dash-counter">
      <div className="dash-counter-value">{value}</div>
      <div className="dash-counter-label">{label}</div>
    </div>
  );
}
