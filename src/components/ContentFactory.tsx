// ════════════════════════════════════════════════════════════════
// CONTENT FACTORY — viral hype pipeline UI (v2: tabs + scheduler)
// ════════════════════════════════════════════════════════════════
// Three tabs:
//   - Pending      ready-to-post drafts (operator pushes them out, or
//                  schedules them, or auto-distributes a batch)
//   - Scheduled    items with future scheduled_for; auto-posts hit
//                  the X API at the slot if creds are configured.
//   - Posted       items that went live; rendered with engagement
//                  numbers (likes/RTs/replies/impressions).
//
// Auto-poster banner at the top reads /api/content/scheduler-status
// to confirm whether X API creds are present. If not, the operator
// can still schedule posts — just has to publish them manually via
// "Open in X" at the slot time.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import './ContentFactory.css';

const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';
const PASS_KEY = 'mvo:dashboard-pass';

type QueueItem = {
  id: number;
  persona: string | null;
  archetype: string;
  format: string;
  hook: string;
  body: string;
  suggested_image: string | null;
  tone_tags: string;
  generated_at: number;
  status: 'pending' | 'scheduled' | 'posted' | 'archived' | 'rejected';
  scheduled_for: number | null;
  posted_at: number | null;
  posted_url: string | null;
  posted_tweet_id: string | null;
  auto_posted: number | null;
  engagement_likes: number | null;
  engagement_retweets: number | null;
  engagement_replies: number | null;
  engagement_impressions: number | null;
  engagement_fetched_at: number | null;
};

type SchedulerStatus = {
  twitter_configured: boolean;
  auto_posting: boolean;
  setup_url?: string;
  required_env?: string[];
};

type Tab = 'pending' | 'scheduled' | 'posted';

const ARCHETYPE_LABELS: Record<string, string> = {
  founder_confession: 'Founder confession',
  contrarian_take: 'Contrarian take',
  emotional_hook: 'Emotional hook',
  persona_switch_moment: 'Persona switch moment',
  niche_specific: 'Niche specific',
  technical_flex: 'Technical flex',
  problem_agitation: 'Problem agitation',
  reply_bait: 'Reply bait',
};

const FORMAT_LABELS: Record<string, string> = {
  single_tweet: 'Single tweet',
  thread_starter: 'Thread starter',
  quote_tweet_hook: 'Quote tweet hook',
  reply_hook: 'Reply hook',
  mini_essay: 'Mini essay (X long)',
};

function pass(): string {
  try { return localStorage.getItem(PASS_KEY) || ''; } catch { return ''; }
}

function fmtSlot(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const sameDay = new Date(now).toDateString() === d.toDateString();
  const opts: Intl.DateTimeFormatOptions = sameDay
    ? { hour: 'numeric', minute: '2-digit' }
    : { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return d.toLocaleString(undefined, opts);
}

function timeUntil(ts: number): string {
  const ms = ts - Date.now();
  if (ms < 0) return 'overdue';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h}h`;
  const days = Math.round(h / 24);
  return `in ${days}d`;
}

function timeAgo(ts: number): string {
  const ms = Date.now() - ts;
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ContentFactory() {
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [scheduled, setScheduled] = useState<QueueItem[]>([]);
  const [posted, setPosted] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);

  function loadStatus() {
    fetch(`${API_URL}/api/content/scheduler-status`, {
      headers: { 'x-dashboard-pass': pass() },
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((d: SchedulerStatus) => setStatus(d))
      .catch(() => { /* non-blocking */ });
  }

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/content/queue?status=pending&limit=60`, { headers: { 'x-dashboard-pass': pass() } }).then(r => r.json()),
      fetch(`${API_URL}/api/content/queue?status=scheduled&limit=60`, { headers: { 'x-dashboard-pass': pass() } }).then(r => r.json()),
      fetch(`${API_URL}/api/content/queue?status=posted&limit=60`, { headers: { 'x-dashboard-pass': pass() } }).then(r => r.json()),
    ])
      .then(([p, s, po]) => {
        setPending(p.items || []);
        setScheduled(s.items || []);
        setPosted(po.items || []);
        setError(null);
      })
      .catch(e => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStatus();
    loadAll();
    const t = setInterval(loadAll, 60_000);
    return () => clearInterval(t);
  }, []);

  async function generate(count = 3) {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/content/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-pass': pass() },
        body: JSON.stringify({ count }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setPending(prev => [...(d.items || []), ...prev]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function autoSchedule() {
    if (autoScheduling) return;
    setAutoScheduling(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/content/auto-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-pass': pass() },
        body: JSON.stringify({ count: 6 }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setAutoScheduling(false);
    }
  }

  async function scheduleOne(id: number) {
    const suggest = new Date(Date.now() + 4 * 3600_000);
    const raw = window.prompt(
      'Schedule for (use the format YYYY-MM-DD HH:MM, local time):',
      toLocalInput(suggest).replace('T', ' '),
    );
    if (!raw) return;
    const when = new Date(raw.replace(' ', 'T')).getTime();
    if (!Number.isFinite(when) || when < Date.now()) {
      setError('Invalid date — must be in the future and parseable as YYYY-MM-DD HH:MM.');
      return;
    }
    try {
      const r = await fetch(`${API_URL}/api/content/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-pass': pass() },
        body: JSON.stringify({ scheduled_for: when }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function unschedule(id: number) {
    try {
      const r = await fetch(`${API_URL}/api/content/${id}/unschedule`, {
        method: 'POST', headers: { 'x-dashboard-pass': pass() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function postNow(id: number) {
    if (!status?.twitter_configured) {
      setError('X API not configured — set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET on Railway.');
      return;
    }
    if (!window.confirm('Post this NOW to your X account? This is irreversible.')) return;
    try {
      const r = await fetch(`${API_URL}/api/content/${id}/post-now`, {
        method: 'POST', headers: { 'x-dashboard-pass': pass() },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function setItemStatus(id: number, next: 'posted' | 'archived' | 'rejected', postedUrl?: string) {
    try {
      const r = await fetch(`${API_URL}/api/content/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-pass': pass() },
        body: JSON.stringify({ status: next, posted_url: postedUrl }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      loadAll();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function copyBody(item: QueueItem) {
    try {
      await navigator.clipboard.writeText(item.body);
      setCopied(item.id);
      setTimeout(() => setCopied(c => (c === item.id ? null : c)), 1400);
    } catch (e) {
      setError('Clipboard blocked. Select + copy manually.');
    }
  }

  function xIntentUrl(item: QueueItem): string {
    return `https://x.com/intent/post?text=${encodeURIComponent(item.body)}`;
  }

  const visible = tab === 'pending' ? pending : tab === 'scheduled' ? scheduled : posted;

  return (
    <div className="cf">
      <div className="cf-top">
        <div>
          <h2 className="cf-title">Content factory</h2>
          <p className="cf-sub">
            Auto-generated launch posts. Pending → Schedule → Posted.
            Cron tops up pending every 6h. Scheduler auto-posts at slot if X API configured.
          </p>
        </div>
        <div className="cf-actions">
          <button
            className="cf-btn-primary"
            disabled={generating}
            onClick={() => generate(3)}
          >
            {generating ? '⟳ generating…' : '＋ Generate 3 more'}
          </button>
          <button
            className="cf-btn-secondary"
            disabled={autoScheduling || pending.length === 0}
            onClick={autoSchedule}
            title="Pick the next 6 pending items and put them on the calendar at sensible per-persona time slots."
          >
            {autoScheduling ? '⟳ scheduling…' : '⏱ Auto-schedule next 6'}
          </button>
          <button className="cf-btn-secondary" onClick={loadAll} disabled={loading}>
            {loading ? '⟳' : '↻'} refresh
          </button>
        </div>
      </div>

      {status && (
        <div className={`cf-banner ${status.twitter_configured ? 'cf-banner-ok' : 'cf-banner-warn'}`}>
          {status.twitter_configured ? (
            <>✓ <strong>X auto-posting is LIVE.</strong> Scheduled items will post automatically at their slot.</>
          ) : (
            <>
              ⚠ <strong>X API not configured.</strong> You can still schedule posts — but they will sit in the Scheduled tab until you publish them via "Open in X". To enable true unattended auto-posting, add{' '}
              <code>X_API_KEY</code>, <code>X_API_SECRET</code>, <code>X_ACCESS_TOKEN</code>, <code>X_ACCESS_TOKEN_SECRET</code> on Railway.{' '}
              <a href={status.setup_url || 'https://developer.x.com/'} target="_blank" rel="noopener noreferrer">developer.x.com →</a>
            </>
          )}
        </div>
      )}

      {error && <div className="cf-error">⚠ {error}</div>}

      <div className="cf-tabs" role="tablist">
        {(['pending', 'scheduled', 'posted'] as Tab[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`cf-tab ${tab === t ? 'cf-tab-active' : ''}`}
            onClick={() => setTab(t)}
          >
            <span style={{ textTransform: 'capitalize' }}>{t}</span>
            <span className="cf-tab-count">
              {t === 'pending' ? pending.length : t === 'scheduled' ? scheduled.length : posted.length}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 && !loading && (
        <div className="cf-empty">
          {tab === 'pending' && (
            <>
              <p>No pending drafts. Either the cron just ran (try refresh) or generation failed (check Railway logs for <code>[content-factory]</code>).</p>
              <button className="cf-btn-primary" onClick={() => generate(3)} disabled={generating}>
                {generating ? '⟳ generating…' : 'Generate now'}
              </button>
            </>
          )}
          {tab === 'scheduled' && <p>Nothing scheduled. Use <strong>Auto-schedule next 6</strong> or schedule individual items from the Pending tab.</p>}
          {tab === 'posted' && <p>No posts logged yet. Once items go live (auto or manual), they show up here with engagement numbers.</p>}
        </div>
      )}

      <div className="cf-grid">
        {visible.map(item => {
          const isPending = tab === 'pending';
          const isScheduled = tab === 'scheduled';
          const isPosted = tab === 'posted';
          return (
            <div key={item.id} className={`cf-card ${isScheduled ? 'cf-card-scheduled' : ''} ${isPosted ? 'cf-card-posted' : ''}`}>
              <div className="cf-card-meta">
                <span className="cf-tag cf-tag-archetype">{ARCHETYPE_LABELS[item.archetype] || item.archetype}</span>
                <span className="cf-tag cf-tag-format">{FORMAT_LABELS[item.format] || item.format}</span>
                {item.persona && <span className="cf-tag cf-tag-persona">{item.persona}</span>}
                {isScheduled && item.scheduled_for && (
                  <span className="cf-tag cf-tag-scheduled" title={new Date(item.scheduled_for).toLocaleString()}>
                    🗓 {fmtSlot(item.scheduled_for)} · {timeUntil(item.scheduled_for)}
                  </span>
                )}
                {isPosted && item.auto_posted ? (
                  <span className="cf-tag cf-tag-auto">⚡ auto-posted</span>
                ) : null}
              </div>

              {item.hook && <div className="cf-card-hook">{item.hook}</div>}
              <div className="cf-card-body">{item.body}</div>

              {item.tone_tags && (
                <div className="cf-card-tones">
                  {item.tone_tags.split(',').filter(Boolean).map(t => (
                    <span key={t} className="cf-tone">{t.trim()}</span>
                  ))}
                </div>
              )}

              {item.suggested_image && (
                <a
                  href={item.suggested_image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cf-card-image-link"
                  title="Open the suggested OG image"
                >
                  <span>🖼️</span> attach <code>{item.suggested_image}</code>
                </a>
              )}

              {isPosted && (
                <div className="cf-card-metrics">
                  <div className="cf-metric"><span className="cf-metric-value">{item.engagement_likes ?? '—'}</span><span className="cf-metric-label">likes</span></div>
                  <div className="cf-metric"><span className="cf-metric-value">{item.engagement_retweets ?? '—'}</span><span className="cf-metric-label">RTs</span></div>
                  <div className="cf-metric"><span className="cf-metric-value">{item.engagement_replies ?? '—'}</span><span className="cf-metric-label">replies</span></div>
                  <div className="cf-metric"><span className="cf-metric-value">{item.engagement_impressions ?? '—'}</span><span className="cf-metric-label">views</span></div>
                </div>
              )}

              <div className="cf-card-actions">
                <button
                  className={`cf-act ${copied === item.id ? 'cf-act-success' : ''}`}
                  onClick={() => copyBody(item)}
                >
                  {copied === item.id ? '✓ copied' : 'Copy text'}
                </button>

                <a
                  className="cf-act"
                  href={isPosted && item.posted_url ? item.posted_url : xIntentUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isPosted ? 'View on X' : 'Open X composer pre-filled'}
                >
                  {isPosted ? 'View on X →' : 'Open in X →'}
                </a>

                {isPending && (
                  <>
                    <button className="cf-act cf-act-schedule" onClick={() => scheduleOne(item.id)}>
                      🗓 Schedule
                    </button>
                    {status?.twitter_configured && (
                      <button className="cf-act cf-act-now" onClick={() => postNow(item.id)} title="Publish via X API right now">
                        ⚡ Post now
                      </button>
                    )}
                    <button
                      className="cf-act"
                      onClick={() => {
                        const url = window.prompt('Paste the live X URL (optional):') || undefined;
                        setItemStatus(item.id, 'posted', url);
                      }}
                      title="Mark as already posted (manual entry)"
                    >
                      Mark posted
                    </button>
                    <button className="cf-act cf-act-warn" onClick={() => setItemStatus(item.id, 'archived')}>
                      Archive
                    </button>
                  </>
                )}

                {isScheduled && (
                  <>
                    {status?.twitter_configured && (
                      <button className="cf-act cf-act-now" onClick={() => postNow(item.id)}>
                        ⚡ Post now
                      </button>
                    )}
                    <button className="cf-act cf-act-schedule" onClick={() => scheduleOne(item.id)} title="Move to a different time">
                      Re-schedule
                    </button>
                    <button className="cf-act cf-act-warn" onClick={() => unschedule(item.id)}>
                      Back to pending
                    </button>
                  </>
                )}
              </div>

              <div className="cf-card-foot">
                <span className="cf-card-id">#{item.id}</span>
                <span>•</span>
                <span>
                  {isPosted && item.posted_at
                    ? `posted ${timeAgo(item.posted_at)}`
                    : `generated ${timeAgo(item.generated_at)}`}
                </span>
                {isPosted && item.engagement_fetched_at && (
                  <>
                    <span>•</span>
                    <span title={new Date(item.engagement_fetched_at).toLocaleString()}>
                      metrics {timeAgo(item.engagement_fetched_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cf-foot-note">
        <strong>Pipeline:</strong> Pending drafts auto-refill every 6h. <em>Auto-schedule</em> spaces 6 items across sensible per-persona time slots (gym personas before 8am, K-pop in the evening, weddings/study in business hours, late-night personas after 9pm). At each slot, the backend posts via X API if configured; otherwise the slot just notifies you to publish manually. Engagement (likes/RTs/replies) is fetched every 30 min for the last 7 days of posts.
      </div>
    </div>
  );
}
