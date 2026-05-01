import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import * as sess from '../lib/session';
import type { StoredMessage } from '../lib/session';
import { getPersona, formatPrice, annualSavings } from '../lib/personas';
import { PersonaPicker } from '../components/PersonaPicker';
import { trackPersonaSwitch, trackMessageSent, trackPickerOpen } from '../lib/analytics';
import { pickOpener } from '../lib/openers';
import './Chat.css';

// Shared-thread message type. The on-screen `streaming` flag is a
// transient render hint, not persisted to localStorage.
type Msg = StoredMessage & { streaming?: boolean };

export function Chat() {
  // URL persona is a "set the active voice" hint. If absent, use whatever
  // the user last selected. The CONVERSATION is one shared thread either way.
  const { persona: urlPersonaId } = useParams();
  const navigate = useNavigate();

  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    return urlPersonaId || sess.getCurrentPersona();
  });
  const persona = getPersona(activePersonaId);

  const [threadMode, setThreadModeState] = useState<sess.ThreadMode>(() => sess.getThreadMode());
  const [messages, setMessages] = useState<Msg[]>(() => sess.getMessages());
  // Contextual opener — re-rolled on persona change so each fresh persona feels present.
  const opener = useMemo(() => pickOpener(persona.id, new Date()), [persona.id]);

  // Live presence subtext — re-computed whenever a message lands or persona switches.
  // Shows 'around' for fresh personas, 'right here' if user just sent something,
  // else 'Nm ago' / 'Nh ago' / 'Nd ago' / 'been a min' for older threads.
  const [presenceTick, setPresenceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPresenceTick(x => x + 1), 60_000); // refresh every minute
    return () => clearInterval(t);
  }, []);
  const presenceText = useMemo(() => {
    const last = sess.getLastVisitTs(persona.id);
    if (!last) return 'around';
    const gap = Date.now() - last;
    if (gap < 60_000) return 'right here';
    if (gap < 3_600_000) return `${Math.round(gap / 60_000)}m ago`;
    if (gap < 86_400_000) return `${Math.round(gap / 3_600_000)}h ago`;
    if (gap < 7 * 86_400_000) return `${Math.round(gap / 86_400_000)}d ago`;
    return 'been a min';
  }, [persona.id, messages.length, presenceTick]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'expired' | 'limit' | 'image-cap' | null>(null);
  const [imageOffer, setImageOffer] = useState<any>(null);    // upgrade payload from server when free image cap hits
  const [selectedCadence, setSelectedCadence] = useState<'monthly' | 'annual'>('monthly');
  const [timeLeft, setTimeLeft] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Validate session + sync URL persona to active voice ───
  useEffect(() => {
    (async () => {
      const local = sess.getSession();
      if (!local) {
        // No session yet — bounce to onboard for the URL persona (or default)
        navigate(`/start/${urlPersonaId || 'kpop'}`);
        return;
      }
      setUserName(local.name);

      // If the URL specifies a persona different from current voice, switch.
      if (urlPersonaId && urlPersonaId !== sess.getCurrentPersona()) {
        sess.setCurrentPersona(urlPersonaId);
        setActivePersonaId(urlPersonaId);
      }

      // Server check on the session itself (does NOT reset on persona switch)
      const result = await api.getSession(local.sessionId);
      if (!result.ok) {
        sess.clearSession();
        navigate(`/start/${urlPersonaId || 'kpop'}`);
        return;
      }
      if (result.data.expired && !result.data.userId) {
        setPaywallReason('expired');
        setShowPaywall(true);
      }
      setSessionValid(true);
    })();
  }, [urlPersonaId, navigate]);

  // ─── Persist messages on every change ───
  useEffect(() => {
    // Strip the transient streaming flag before persisting
    sess.saveMessages(messages.map(({ streaming, ...rest }) => rest));
  }, [messages]);

  // ─── Reload thread when persona or mode changes ───
  // In isolated mode, switching personas swaps the visible thread (each persona
  // has its own memory). In shared mode, the merged view is the same regardless
  // of which persona is active.
  useEffect(() => {
    setMessages(sess.getMessages());
  }, [persona.id, threadMode]);

  // ─── Body persona attribute drives CSS theming ───
  useEffect(() => {
    document.body.setAttribute('data-persona', persona.id);
    return () => { document.body.removeAttribute('data-persona'); };
  }, [persona.id]);

  // ─── Trial timer tick ───
  useEffect(() => {
    const update = () => {
      const local = sess.getSession();
      if (!local) return;
      setTimeLeft(sess.timeLeftMs(local.expiresAt));
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  // ─── Auto-scroll to latest message ───
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ─── Auto-grow textarea ───
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input]);

  // ─── Image generation (MVP) ───
  // The user types a description in the input box, taps the image button.
  // We send their text to the backend, get a data URL back, and append a
  // user msg ('🖼 generate: <prompt>') + assistant msg with the image.
  const [generatingImage, setGeneratingImage] = useState(false);
  const generateImageNow = async () => {
    if (generatingImage || streaming) return;
    const prompt = input.trim();
    if (!prompt) return;
    const local = sess.getSession();
    if (!local) { navigate(`/start/${persona.id}`); return; }

    setInput('');
    setGeneratingImage(true);

    // Show the user's image-request as a message in the thread
    const userMsg: Msg = { role: 'user', content: `🖼 ${prompt}`, ts: Date.now() };
    const placeholder: Msg = {
      role: 'assistant',
      content: '',
      persona: persona.id,
      ts: Date.now(),
      streaming: true,
    };
    const baseHistory = [...messages, userMsg, placeholder];
    setMessages(baseHistory);

    try {
      const result = await api.generateImage(local.sessionId, persona.id, prompt);
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: result.caption || '',
          persona: persona.id,
          ts: copy[copy.length - 1]?.ts,
          image: { dataUrl: result.dataUrl, alt: prompt },
          streaming: false,
        };
        return copy;
      });
    } catch (err: any) {
      // Detect the daily-image-cap 402 — surface the upgrade modal instead of an inline error.
      if (err?.code === 'IMAGE_LIMIT_DAILY' && err?.payload?.upgrade) {
        // Drop the placeholder assistant message AND the user's image-request line — we'll
        // show the modal instead so the thread doesn't get cluttered with failed attempts.
        setMessages(m => m.slice(0, -2));
        setImageOffer(err.payload.upgrade);
        setPaywallReason('image-cap');
        setShowPaywall(true);
      } else if (err?.code === 'NEEDS_SUBSCRIPTION') {
        setMessages(m => m.slice(0, -2));
        setPaywallReason('limit');
        setShowPaywall(true);
      } else if (err?.code === 'SESSION_EXPIRED') {
        setMessages(m => m.slice(0, -2));
        setPaywallReason('expired');
        setShowPaywall(true);
      } else {
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: `(couldn\u2019t generate that image: ${err?.message || 'unknown error'})`,
            persona: persona.id,
            ts: copy[copy.length - 1]?.ts,
            streaming: false,
          };
          return copy;
        });
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  // ─── Persona switch (from picker or other source) ───
  const handleSwitchPersona = (newPersonaId: string) => {
    if (newPersonaId === persona.id) return;
    trackPersonaSwitch(persona.id, newPersonaId, messages.length);
    sess.setCurrentPersona(newPersonaId);
    setActivePersonaId(newPersonaId);
    // Update URL so back/share links reflect the active voice without reloading
    navigate(`/chat/${newPersonaId}`, { replace: true });
  };

  // Long-press the persona name in header → open picker (handled by ref + native event)
  const headerPersonaRef = useRef<HTMLDivElement>(null);
  const [pickerKick, setPickerKick] = useState(0);  // forces picker remount/open
  useEffect(() => {
    const el = headerPersonaRef.current;
    if (!el) return;
    let pressTimer: number | null = null;
    const onDown = () => {
      pressTimer = window.setTimeout(() => {
        // Trigger via a synthetic click on the picker trigger
        document.querySelector<HTMLButtonElement>('.pp-trigger')?.click();
        setPickerKick(k => k + 1);
      }, 500);
    };
    const onUp = () => { if (pressTimer) { window.clearTimeout(pressTimer); pressTimer = null; } };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
    };
  }, [pickerKick]);

  // ─── Send a message ───
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const local = sess.getSession();
    if (!local) { navigate(`/start/${persona.id}`); return; }

    setInput('');
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    const baseHistory = [...messages, userMsg];
    setMessages(baseHistory);
    setStreaming(true);
    trackMessageSent(persona.id, baseHistory.length);
    setMessages(m => [...m, { role: 'assistant', content: '', persona: persona.id, ts: Date.now(), streaming: true }]);

    try {
      let acc = '';
      // Pass full thread + persona-of-the-moment to backend
      const apiMessages = baseHistory.map(m => ({ role: m.role, content: m.content }));
      for await (const chunk of api.streamChat(local.sessionId, apiMessages, persona.id, threadMode)) {
        if (chunk.type === 'chunk') {
          acc += chunk.text;
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: acc, persona: persona.id, ts: copy[copy.length - 1]?.ts, streaming: true };
            return copy;
          });
        } else if (chunk.type === 'done') {
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: acc, persona: persona.id, ts: copy[copy.length - 1]?.ts, streaming: false };
            return copy;
          });
        } else if (chunk.type === 'error') {
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: 'assistant', content: `Sorry, something glitched. (${chunk.message})`,
              persona: persona.id, ts: copy[copy.length - 1]?.ts, streaming: false,
            };
            return copy;
          });
        }
      }
    } catch (err: any) {
      setMessages(m => m.slice(0, -1));
      if (err.message === 'SESSION_EXPIRED') {
        setPaywallReason('expired');
        setShowPaywall(true);
      } else if (err.message === 'NEEDS_SUBSCRIPTION') {
        setPaywallReason('limit');
        setShowPaywall(true);
      }
    } finally {
      setStreaming(false);
    }
  };

  const handlePaywallSignUp = () => {
    const local = sess.getSession();
    const auth = sess.getAuth();
    if (auth) {
      api.startCheckout(persona.id, selectedCadence).then(r => {
        if (r.ok && r.data.url) window.location.href = r.data.url;
      });
      return;
    }
    if (local) {
      navigate(`/auth/magic?session=${local.sessionId}&next=${encodeURIComponent(`/chat/${persona.id}?subscribe=${selectedCadence}`)}`);
    } else {
      navigate(`/auth/magic?next=${encodeURIComponent(`/chat/${persona.id}?subscribe=${selectedCadence}`)}`);
    }
  };

  // ─── Per-persona message counts for picker badges ───
  const countByPersona = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of messages) {
      if (m.role === 'assistant' && m.persona) {
        counts[m.persona] = (counts[m.persona] || 0) + 1;
      }
    }
    return counts;
  }, [messages]);

  // ─── Thread-mode toggle ───
  const toggleThreadMode = () => {
    const next: sess.ThreadMode = threadMode === 'isolated' ? 'shared' : 'isolated';
    sess.setThreadMode(next);
    setThreadModeState(next);
    // Effect above will reload messages for the new view.
  };

  const formattedTime = sess.formatTimeLeft(timeLeft);
  const savings = annualSavings(persona);

  if (!sessionValid) {
    return (
      <div className="chat" style={{ '--accent': persona.accent, '--accent-rgb': persona.accentRgb } as any}>
        <div className="chat-bg" style={{ background: persona.bg }} />
        <div className="chat-overlay" />
        <div style={{ position: 'relative', zIndex: 10, margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat" style={{ '--accent': persona.accent, '--accent-rgb': persona.accentRgb } as any}>
      <div className="chat-bg" style={{ background: persona.bg }} />
      {persona.video && (
        <video
          className="chat-bg-video"
          key={`chat-bg-${persona.id}`}
          src={persona.video}
          autoPlay muted loop playsInline preload="none"
        />
      )}
      <div className="chat-overlay" />

      <div className="chat-top">
        <button className="chat-back" onClick={() => navigate('/')} title="Back to home">←</button>
        <div className="chat-top-title" ref={headerPersonaRef} title="Long-press to switch persona">
          <span className="chat-presence-dot" aria-hidden />
          <span className="chat-presence-stack">
            <span className="chat-presence-name">{persona.name}</span>
            <span className="chat-presence-sub">{presenceText}</span>
          </span>
        </div>
        <button
          className={`chat-thread-mode ${threadMode}`}
          onClick={toggleThreadMode}
          title={
            threadMode === 'isolated'
              ? 'Private threads — each persona has its own conversation. Tap to share memory across all 20 voices.'
              : 'Shared mind — all 20 voices share one memory. Tap to keep each thread private.'
          }
          aria-label={`Thread mode: ${threadMode}. Tap to toggle.`}
        >
          {threadMode === 'isolated' ? '🔒 private' : '🧠 shared'}
        </button>
        <div className="chat-timer">
          <span className="timer-dot" /> {formattedTime} free
        </div>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-welcome fade-in">
            {opener && (
              <div className="welcome-opener" aria-label={`${persona.name} opens with`}>
                <span className="welcome-opener-pulse" aria-hidden />
                <span className="welcome-opener-text">{opener}</span>
              </div>
            )}
            <h1 className="welcome-headline">
              {userName ? `Hey ${userName}! ` : ''}{persona.headline}
            </h1>
            <p className="welcome-sub">{persona.sub}</p>
            <div className="welcome-starters">
              {persona.starters.map(s => (
                <button
                  key={s}
                  className="welcome-starter"
                  onClick={() => {
                    const stripped = s.replace(/^[^\p{L}\p{N}]+\s*/u, '');
                    sendMessage(stripped || s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          // For assistant messages, show the responding persona's name + accent.
          const speakingPersona = m.role === 'assistant' && m.persona ? getPersona(m.persona) : null;
          return (
            <div key={i} className={`msg ${m.role}`}>
              {speakingPersona && (
                <div
                  className="msg-author"
                  style={{ color: speakingPersona.accent }}
                  title={`Responded as ${speakingPersona.name}`}
                >
                  {speakingPersona.name}
                </div>
              )}
              <div
                className="msg-bubble"
                style={speakingPersona
                  ? ({ '--accent': speakingPersona.accent, '--accent-rgb': speakingPersona.accentRgb } as any)
                  : undefined}
              >
                {m.image && m.image.dataUrl && (
                  <img
                    src={m.image.dataUrl}
                    alt={m.image.alt}
                    className="msg-image"
                    loading="lazy"
                  />
                )}
                {m.image && !m.image.dataUrl && (
                  <div className="msg-image-placeholder" title="Image was generated in a previous session — not persisted">
                    🖼 image: {m.image.alt}
                  </div>
                )}
                {m.content || (m.streaming ? <span className="typing"><span /><span /><span /></span> : '')}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-box">
          <PersonaPicker
            currentPersonaId={persona.id}
            onPick={handleSwitchPersona}
            countByPersona={countByPersona}
          />
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder={`Message ${persona.name}…`}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={streaming}
          />
          <button
            className="chat-image"
            onClick={generateImageNow}
            disabled={!input.trim() || streaming || generatingImage}
            title="Generate image from text in the box"
            aria-label="Generate image"
          >
            {generatingImage ? <span className="spinner" /> : '🖼'}
          </button>
          <button
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming || generatingImage}
            title="Send message"
          >
            {streaming ? <span className="spinner" /> : '↑'}
          </button>
        </div>
        <div className="chat-memory-badge">
          {threadMode === 'isolated'
            ? `● Just between you and ${persona.name}. Yours alone.`
            : '● Shared memory across all 20 voices. Yours alone.'}
        </div>
      </div>

      {showPaywall && (
        <div className="paywall-backdrop" onClick={() => setShowPaywall(false)}>
          <div className="paywall fade-in" onClick={e => e.stopPropagation()}>
            <div className="paywall-emoji">{paywallReason === 'image-cap' ? '🎨' : '💜'}</div>
            <h2 className="paywall-title">
              {paywallReason === 'expired' && 'Your 7-day trial is up'}
              {paywallReason === 'image-cap' && (imageOffer ? `That was your ${imageOffer.imageQuotaMonthly ? '3rd image today' : 'last free image'}.` : 'You\'ve hit today\'s image limit')}
              {paywallReason === 'limit' && `Don't want to lose me, right?`}
            </h2>
            <p className="paywall-sub">
              {paywallReason === 'expired' && (
                <>We remember everything we talked about — across every persona. Keep going for as little as {formatPrice(persona.priceMonthly)}/mo. One subscription unlocks all 20.</>
              )}
              {paywallReason === 'image-cap' && imageOffer && (
                <>Free accounts get {imageOffer.freeQuota || 3} images a day. Upgrade to {imageOffer.product || 'My Very Own'} and you'll get <strong>{imageOffer.imageQuotaMonthly} images every month</strong> plus unlimited chat across all 20 voices. Resets at midnight UTC for free accounts.</>
              )}
              {paywallReason === 'limit' && (
                <>We're just getting started. We already know so much about you — let's keep building. One sub unlocks all 20.</>
              )}
            </p>
            <div className="paywall-pricing">
              <button
                className={`pricing-tier ${selectedCadence === 'monthly' ? 'active' : ''}`}
                onClick={() => setSelectedCadence('monthly')}
              >
                <div className="tier-name">Monthly</div>
                <div className="tier-price">{formatPrice(persona.priceMonthly)}<span>/mo</span></div>
              </button>
              <button
                className={`pricing-tier ${selectedCadence === 'annual' ? 'active' : ''}`}
                onClick={() => setSelectedCadence('annual')}
              >
                <div className="tier-name">Annual · Save {savings}%</div>
                <div className="tier-price">{formatPrice(persona.priceAnnual)}<span>/yr</span></div>
              </button>
            </div>
            <button className="paywall-cta" onClick={handlePaywallSignUp}>
              Make it permanent →
            </button>
            <button className="paywall-skip" onClick={() => setShowPaywall(false)}>Not yet</button>
          </div>
        </div>
      )}
    </div>
  );
}
