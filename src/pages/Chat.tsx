import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import * as sess from '../lib/session';
import type { StoredMessage } from '../lib/session';
import { getPersona, formatPrice, annualSavings } from '../lib/personas';
import { PersonaPicker } from '../components/PersonaPicker';
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

  const [messages, setMessages] = useState<Msg[]>(() => sess.getMessages());
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'expired' | 'limit' | null>(null);
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

  // ─── Persona switch (from picker or other source) ───
  const handleSwitchPersona = (newPersonaId: string) => {
    if (newPersonaId === persona.id) return;
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
    setMessages(m => [...m, { role: 'assistant', content: '', persona: persona.id, ts: Date.now(), streaming: true }]);

    try {
      let acc = '';
      // Pass full thread + persona-of-the-moment to backend
      const apiMessages = baseHistory.map(m => ({ role: m.role, content: m.content }));
      for await (const chunk of api.streamChat(local.sessionId, apiMessages, persona.id)) {
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
          autoPlay muted loop playsInline preload="auto"
        />
      )}
      <div className="chat-overlay" />

      <div className="chat-top">
        <button className="chat-back" onClick={() => navigate('/')} title="Back to home">←</button>
        <div className="chat-top-title" ref={headerPersonaRef} title="Long-press to switch persona">
          {persona.name}
        </div>
        <div className="chat-timer">
          <span className="timer-dot" /> {formattedTime} free
        </div>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-welcome fade-in">
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
            className="chat-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            title="Send message"
          >
            {streaming ? <span className="spinner" /> : '↑'}
          </button>
        </div>
        <div className="chat-memory-badge">● One thread. Twenty voices. All yours.</div>
      </div>

      {showPaywall && (
        <div className="paywall-backdrop" onClick={() => setShowPaywall(false)}>
          <div className="paywall fade-in" onClick={e => e.stopPropagation()}>
            <div className="paywall-emoji">💜</div>
            <h2 className="paywall-title">
              {paywallReason === 'expired' ? 'Your 7-day trial is up' : `Don't want to lose me, right?`}
            </h2>
            <p className="paywall-sub">
              {paywallReason === 'expired'
                ? `We remember everything we talked about — across every persona. Keep going for as little as ${formatPrice(persona.priceMonthly)}/mo. One subscription unlocks all 20.`
                : `We're just getting started. We already know so much about you — let's keep building. One sub unlocks all 20.`
              }
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
