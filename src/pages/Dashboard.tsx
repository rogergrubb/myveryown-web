// ════════════════════════════════════════════════════════════════
// DASHBOARD — admin / stats view (now backed by real visit data)
// ════════════════════════════════════════════════════════════════
// Password-gated. Pulls aggregated visit stats from
// GET /api/dashboard/stats (server-side IP logs, geo, bot detection).
// Renders a 3D globe with dots per known location + tabular summaries.
//
// Globe is lazy-loaded (only when dashboard mounts) so the Three.js +
// globe.gl bundle (~1MB) doesn't bloat the main app.
// ════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { PERSONAS } from '../lib/personas';
import * as sess from '../lib/session';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ContentFactory } from '../components/ContentFactory';
import './Dashboard.css';

const STORAGE_KEY = 'mvo:dashboard-unlocked';
const PASS_KEY = 'mvo:dashboard-pass';
const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

const GlobeView = lazy(() => import('../components/DashboardGlobe').then(m => ({ default: m.DashboardGlobe })));

type Stats = {
  generated_at: number;
  totals: {
    all_time: { visits: number; unique: number; humans: number; bots: number };
    last_24h: { visits: number; unique: number; humans: number; bots: number };
    last_7d:  { visits: number; unique: number; humans: number; bots: number };
  };
  top_countries: { country: string; visits: number; unique: number }[];
  top_paths: { path: string; visits: number }[];
  top_personas: { persona: string; visits: number }[];
  top_campaigns: { campaign: string; channel: string | null; visits: number; unique: number }[];
  top_utm_sources: { source: string; visits: number; unique: number }[];
  globe_points: { lat: number; lon: number; city: string | null; country: string | null; visits: number }[];
  recent_visits: {
    ts: number; ip: string; country: string | null; city: string | null;
    ua: string | null; path: string | null; persona: string | null;
    is_bot: number; bot_reason: string | null;
    utm_source?: string | null; campaign_slug?: string | null;
  }[];
  top_bot_uas: { ua: string; visits: number }[];
};

export function Dashboard() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' && !!localStorage.getItem(PASS_KEY); } catch { return false; }
  });
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // ─── Auto-refresh every 30s while unlocked ───
  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(() => setRefreshTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, [unlocked]);

  // ─── Fetch stats from backend whenever unlocked or refreshTick changes ───
  useEffect(() => {
    if (!unlocked) return;
    const pass = localStorage.getItem(PASS_KEY) || '';
    let cancelled = false;
    setLoading(true);
    fetch(`${API_URL}/api/dashboard/stats`, { headers: { 'x-dashboard-pass': pass } })
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            // Server password rejected — re-lock
            try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PASS_KEY); } catch {}
            setUnlocked(false);
            throw new Error('Server rejected password.');
          }
          throw new Error(`Stats fetch failed: ${r.status}`);
        }
        return r.json() as Promise<Stats>;
      })
      .then(s => { if (!cancelled) { setStats(s); setFetchError(null); } })
      .catch(err => { if (!cancelled) setFetchError(err.message || String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [unlocked, refreshTick]);

  function tryUnlock() {
    if (!pw) { setPwError(true); return; }
    // Optimistically unlock — the actual server check happens on next stats fetch.
    // If wrong, the fetch returns 401 and we re-lock.
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      localStorage.setItem(PASS_KEY, pw);
    } catch {}
    setUnlocked(true);
    setPwError(false);
  }
  function lock() {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(PASS_KEY); } catch {}
    setUnlocked(false);
    setStats(null);
  }

  // ─── Locked screen ───
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
          {pwError && <div className="dash-lock-error">Try again.</div>}
          <div className="dash-lock-note">
            Stats only. Password is verified server-side at /api/dashboard/stats.
          </div>
        </div>
      </div>
    );
  }

  // ─── Helpers ───
  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  function shortenUa(ua: string | null) {
    if (!ua) return '—';
    return ua.slice(0, 80) + (ua.length > 80 ? '…' : '');
  }
  function shortenIp(ip: string | undefined | null) {
    if (!ip) return '—';
    // Mask last octet for less casual exposure even on the admin view
    const m = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
    return m ? `${m[1]}.×` : ip.slice(0, 32);
  }

  // ─── Local session state (this browser) ───
  const local = sess.getSession();
  const auth = sess.getAuth();
  const messages = sess.getMessages();
  const currentPersona = sess.getCurrentPersona();
  const persona = PERSONAS.find(p => p.id === currentPersona) || PERSONAS[0];

  return (
    <div className="dash">
      <header className="dash-top">
        <div>
          <div className="dash-top-eyebrow">myveryown.page · admin</div>
          <h1 className="dash-top-title">Dashboard</h1>
        </div>
        <div className="dash-top-actions">
          <span className={'dash-status ' + (loading ? 'dash-status-loading' : fetchError ? 'dash-status-error' : 'dash-status-ok')}>
            {loading ? '⟳ refreshing' : fetchError ? '✗ ' + fetchError : '● live · ' + (stats ? timeAgo(stats.generated_at) : '—')}
          </span>
          <button className="dash-link" onClick={() => setRefreshTick(n => n + 1)} title="Refresh now">↻ refresh</button>
          <button className="dash-link" onClick={() => window.open('https://vercel.com/roger-grubbs-projects-2e0adcba/myveryown-web', '_blank')}>Vercel ↗</button>
          <button className="dash-link" onClick={() => window.open('https://github.com/rogergrubb/myveryown-web', '_blank')}>GitHub ↗</button>
          <button className="dash-link" onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}>Stripe ↗</button>
          <button className="dash-lock-out" onClick={lock} title="Lock dashboard">⎙ lock</button>
        </div>
      </header>

      {!stats && loading && (
        <div className="dash-loading">
          <div className="spinner" />
          <span>Loading stats…</span>
        </div>
      )}

      {stats && (
        <>
          <div className="dash-grid">
            {/* Top-line totals */}
            <section className="dash-card dash-card-wide">
              <h2>Traffic at a glance</h2>
              <div className="dash-totals">
                <TotalsBlock title="Last 24h" t={stats.totals.last_24h} />
                <TotalsBlock title="Last 7 days" t={stats.totals.last_7d} />
                <TotalsBlock title="All time" t={stats.totals.all_time} />
              </div>
            </section>

            {/* 3D Globe */}
            <section className="dash-card dash-card-wide dash-card-globe">
              <h2>Where they're coming from <span className="dash-pill">{stats.globe_points.length} points · last 7d · humans only</span></h2>
              <ErrorBoundary fallback={
                <div className="dash-card-note" style={{ padding: 40, textAlign: 'center' }}>
                  Globe failed to mount. Stats below are still live.
                </div>
              }>
                <Suspense fallback={<div className="dash-globe-fallback"><div className="spinner" /> loading globe…</div>}>
                  <GlobeView points={stats.globe_points} />
                </Suspense>
              </ErrorBoundary>
              {stats.globe_points.length === 0 && (
                <p className="dash-card-note">
                  No geo-tagged visits yet. The globe lights up once Vercel's edge
                  starts injecting <code>x-vercel-ip-latitude</code> headers
                  on real traffic.
                </p>
              )}
            </section>

            {/* Top countries */}
            <section className="dash-card">
              <h2>Top countries <span className="dash-pill-mini">7d</span></h2>
              {stats.top_countries.length === 0 ? <p className="dash-card-note">No country data yet.</p> : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>Country</th><th>Visits</th><th>Unique IPs</th></tr></thead>
                  <tbody>
                    {stats.top_countries.slice(0, 12).map(c => (
                      <tr key={c.country}>
                        <td>{flag(c.country)} {c.country}</td>
                        <td>{c.visits}</td>
                        <td>{c.unique}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Persona popularity */}
            <section className="dash-card">
              <h2>Persona popularity <span className="dash-pill-mini">7d</span></h2>
              {stats.top_personas.length === 0 ? <p className="dash-card-note">No persona route hits yet.</p> : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>Persona</th><th>Visits</th></tr></thead>
                  <tbody>
                    {stats.top_personas.map(p => {
                      const personaInfo = PERSONAS.find(x => x.id === p.persona);
                      return (
                        <tr key={p.persona}>
                          <td>
                            <span className="dash-dot" style={{ background: personaInfo?.accent || '#888' }} />
                            {personaInfo?.name || p.persona}
                          </td>
                          <td>{p.visits}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            {/* Top routes */}
            <section className="dash-card">
              <h2>Top routes <span className="dash-pill-mini">7d</span></h2>
              {stats.top_paths.length === 0 ? <p className="dash-card-note">No route data yet.</p> : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>Path</th><th>Visits</th></tr></thead>
                  <tbody>
                    {stats.top_paths.slice(0, 12).map(p => (
                      <tr key={p.path}><td><code>{p.path}</code></td><td>{p.visits}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Top campaigns — attribution */}
            <section className="dash-card">
              <h2>Top campaigns <span className="dash-pill-mini">7d</span></h2>
              {(stats.top_campaigns?.length ?? 0) === 0 ? (
                <p className="dash-card-note">
                  No tracked campaigns yet. Add UTM params or <code>campaign_slug</code> to your
                  share URLs (e.g. <code>?utm_source=twitter&campaign_slug=kpop-launch</code>)
                  and they'll show up here.
                </p>
              ) : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>Campaign</th><th>Channel</th><th>Visits</th><th>Unique</th></tr></thead>
                  <tbody>
                    {stats.top_campaigns.slice(0, 12).map(c => (
                      <tr key={c.campaign}>
                        <td><code>{c.campaign}</code></td>
                        <td>{c.channel || '—'}</td>
                        <td>{c.visits}</td>
                        <td>{c.unique}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* UTM sources */}
            <section className="dash-card">
              <h2>Top UTM sources <span className="dash-pill-mini">7d</span></h2>
              {(stats.top_utm_sources?.length ?? 0) === 0 ? (
                <p className="dash-card-note">No UTM-tagged traffic yet.</p>
              ) : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>Source</th><th>Visits</th><th>Unique</th></tr></thead>
                  <tbody>
                    {stats.top_utm_sources.slice(0, 12).map(s => (
                      <tr key={s.source}><td>{s.source}</td><td>{s.visits}</td><td>{s.unique}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Bots — top UAs */}
            <section className="dash-card">
              <h2>Bots seen <span className="dash-pill-mini">7d</span></h2>
              {stats.top_bot_uas.length === 0 ? <p className="dash-card-note">No bot traffic yet — or the heuristic isn't catching it.</p> : (
                <table className="dash-table dash-table-tight">
                  <thead><tr><th>User-Agent</th><th>Hits</th></tr></thead>
                  <tbody>
                    {stats.top_bot_uas.slice(0, 8).map(b => (
                      <tr key={b.ua}><td title={b.ua}>{shortenUa(b.ua).slice(0, 60)}</td><td>{b.visits}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Local session state */}
            <section className="dash-card">
              <h2>Your session</h2>
              {local ? (
                <table className="dash-table dash-table-tight">
                  <tbody>
                    <tr><td>Session ID</td><td><code>{local.sessionId}</code></td></tr>
                    <tr><td>Name</td><td>{local.name || <em>—</em>}</td></tr>
                    <tr><td>Active voice</td><td><span style={{ color: persona.accent }}>● {persona.name}</span></td></tr>
                    <tr><td>Messages in thread</td><td>{messages.length}</td></tr>
                    <tr><td>Trial expires</td><td>{sess.formatTimeLeft(sess.timeLeftMs(local.expiresAt))}</td></tr>
                    <tr><td>Authenticated</td><td>{auth ? `Yes — ${auth.user.email}` : <em>No (anonymous)</em>}</td></tr>
                  </tbody>
                </table>
              ) : (
                <p className="dash-card-note">No local session yet.</p>
              )}
            </section>

            {/* Content factory — viral hype pipeline */}
            <section className="dash-card dash-card-wide">
              <ContentFactory />
            </section>

            {/* Recent visit feed */}
            <section className="dash-card dash-card-wide">
              <h2>Recent visits <span className="dash-pill-mini">last 100</span></h2>
              {stats.recent_visits.length === 0 ? <p className="dash-card-note">Quiet right now.</p> : (
                <div className="dash-events" style={{ maxHeight: 480 }}>
                  {stats.recent_visits.map((v, i) => (
                    <div key={i} className={`dash-event ${v.is_bot ? 'dash-event-bot' : 'dash-event-human'}`}>
                      <span className="dash-event-time">{timeAgo(v.ts)}</span>
                      <span className="dash-event-name">
                        {v.is_bot ? '🤖' : '👤'} {flag(v.country)} {v.city || v.country || '—'}
                      </span>
                      <span className="dash-event-detail">
                        {v.path && <span className="dash-event-prop"><b>path</b>={v.path}</span>}
                        {v.persona && <span className="dash-event-prop"><b>persona</b>={v.persona}</span>}
                        {v.utm_source && <span className="dash-event-prop"><b>src</b>={v.utm_source}</span>}
                        {v.campaign_slug && <span className="dash-event-prop"><b>campaign</b>={v.campaign_slug}</span>}
                        <span className="dash-event-prop"><b>ip</b>={shortenIp(v.ip)}</span>
                        {v.is_bot && v.bot_reason && <span className="dash-event-prop"><b>bot</b>={v.bot_reason}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <footer className="dash-foot">
            <span>Stats refreshed every 30s</span>
            <span>· Server captures IP via Vercel headers · IP hashed with salt for aggregation</span>
            <span>· Privacy disclosure live at <a href="/privacy.html" target="_blank" rel="noopener">/privacy.html</a></span>
          </footer>
        </>
      )}
    </div>
  );
}

function TotalsBlock({ title, t }: { title: string; t: { visits: number; unique: number; humans: number; bots: number } }) {
  return (
    <div className="dash-totals-block">
      <div className="dash-totals-title">{title}</div>
      <div className="dash-totals-row">
        <Counter label="Visits" value={t.visits} />
        <Counter label="Unique IPs" value={t.unique} />
        <Counter label="Humans" value={t.humans} />
        <Counter label="Bots" value={t.bots} />
      </div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="dash-counter">
      <div className="dash-counter-value">{value.toLocaleString()}</div>
      <div className="dash-counter-label">{label}</div>
    </div>
  );
}

// ISO 3166-1 alpha-2 → flag emoji
function flag(country: string | null): string {
  if (!country || country.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(country.charCodeAt(0) + offset, country.charCodeAt(1) + offset);
}
