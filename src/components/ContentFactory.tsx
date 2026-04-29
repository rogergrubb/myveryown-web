// ════════════════════════════════════════════════════════════════
// CONTENT FACTORY — viral hype pipeline UI
// ════════════════════════════════════════════════════════════════
// Surfaces the auto-generated content queue from the backend. Each
// card is one ready-to-post variation. The operator can:
//   - Copy the body to clipboard
//   - Open X with the post pre-filled (intent URL — zero setup)
//   - Mark posted (records the URL for performance correlation)
//   - Archive (kills it forever)
//   - Generate 3 fresh variations on demand
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
};

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

export function ContentFactory() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  function load() {
    setLoading(true);
    fetch(`${API_URL}/api/content/queue?status=pending&limit=60`, {
      headers: { 'x-dashboard-pass': pass() },
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => { setItems(d.items || []); setError(null); })
      .catch(e => setError(e.message || String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function generate(count = 3) {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/api/content/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-pass': pass(),
        },
        body: JSON.stringify({ count }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      // Prepend new items
      setItems(prev => [...(d.items || []), ...prev]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id: number, status: 'posted' | 'archived', postedUrl?: string) {
    try {
      await fetch(`${API_URL}/api/content/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-pass': pass(),
        },
        body: JSON.stringify({ status, posted_url: postedUrl }),
      });
      setItems(prev => prev.filter(it => it.id !== id));
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

  // X intent URL — opens the X composer with the post pre-filled.
  // The operator hits "Tweet" once. Per X's terms, this is an
  // official sharing endpoint and works without API keys.
  function xIntentUrl(item: QueueItem): string {
    const text = item.body;
    return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="cf">
      <div className="cf-top">
        <div>
          <h2 className="cf-title">Content factory</h2>
          <p className="cf-sub">
            Fresh launch posts — auto-refilled to ~9 pending. Sampled across
            8 archetypes × 5 formats × 20 personas × time-of-day. Backend
            cron tops up every 6h.
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
          <button className="cf-btn-secondary" onClick={load} disabled={loading}>
            {loading ? '⟳' : '↻'} refresh
          </button>
        </div>
      </div>

      {error && <div className="cf-error">⚠ {error}</div>}

      {items.length === 0 && !loading && (
        <div className="cf-empty">
          <p>Queue is empty. Either the backend just deployed (cron will fill it within a minute) or generation failed (check Railway logs for <code>[content-factory]</code>).</p>
          <button className="cf-btn-primary" onClick={() => generate(3)} disabled={generating}>
            {generating ? '⟳ generating…' : 'Generate now'}
          </button>
        </div>
      )}

      <div className="cf-grid">
        {items.map(item => (
          <div key={item.id} className="cf-card">
            <div className="cf-card-meta">
              <span className="cf-tag cf-tag-archetype">{ARCHETYPE_LABELS[item.archetype] || item.archetype}</span>
              <span className="cf-tag cf-tag-format">{FORMAT_LABELS[item.format] || item.format}</span>
              {item.persona && <span className="cf-tag cf-tag-persona">{item.persona}</span>}
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
                title="Open the suggested OG image (right-click → save → drag onto your tweet)"
              >
                <span>🖼️</span> attach <code>{item.suggested_image}</code>
              </a>
            )}

            <div className="cf-card-actions">
              <button
                className={`cf-act ${copied === item.id ? 'cf-act-success' : ''}`}
                onClick={() => copyBody(item)}
              >
                {copied === item.id ? '✓ copied' : 'Copy text'}
              </button>
              <a
                className="cf-act cf-act-primary"
                href={xIntentUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens X with the post pre-filled. You hit Tweet."
              >
                Open in X →
              </a>
              <button
                className="cf-act"
                onClick={() => {
                  const url = window.prompt('Paste the live X URL (optional, helps correlate performance later):') || undefined;
                  setStatus(item.id, 'posted', url);
                }}
              >
                Mark posted
              </button>
              <button className="cf-act cf-act-warn" onClick={() => setStatus(item.id, 'archived')}>
                Archive
              </button>
            </div>

            <div className="cf-card-foot">
              <span className="cf-card-id">#{item.id}</span>
              <span>•</span>
              <span>{new Date(item.generated_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cf-foot-note">
        <strong>Auto-posting to X:</strong> the "Open in X" button uses
        X's official intent URL — works today with zero setup. For true
        unattended posting (server posts on your behalf at optimal slots),
        you'd need to register an X developer app and add{' '}
        <code>X_API_KEY</code>, <code>X_API_SECRET</code>,{' '}
        <code>X_ACCESS_TOKEN</code>, and <code>X_ACCESS_TOKEN_SECRET</code>{' '}
        to Railway's env. Free tier: 1,500 posts/month. Set up at{' '}
        <a href="https://developer.x.com/" target="_blank" rel="noopener">
          developer.x.com
        </a>
        .
      </div>
    </div>
  );
}
