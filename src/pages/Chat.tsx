import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import * as sess from '../lib/session';
import { getPersona, formatPrice, annualSavings } from '../lib/personas';
import './Chat.css';

type Msg = { role: 'user' | 'assistant'; content: string; streaming?: boolean };

export function Chat() {
  const { persona: personaId = 'kpop' } = useParams();
  const navigate = useNavigate();
  const persona = getPersona(personaId);
  const [messages, setMessages] = useState<Msg[]>([]);
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

  // Validate session on mount — server-side check, not just localStorage
  useEffect(() => {
    (async () => {
      const local = sess.getSession();
      if (!local || local.persona !== persona.id) {
        navigate(`/start/${persona.id}`);
        return;
      }
      setUserName(local.name);
      // Server check
      const result = await api.getSession(local.sessionId);
      if (!result.ok) {
        // Session lost on server — start over
        sess.clearSession();
        navigate(`/start/${persona.id}`);
        return;
      }
      if (result.data.expired && !result.data.userId) {
        setPaywallReason('expired');
        setShowPaywall(true);
      }
      setSessionValid(true);
      document.body.setAttribute('data-persona', persona.id);
    })();
    return () => { document.body.removeAttribute('data-persona'); };
  }, [persona.id, navigate]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const local = sess.getSession();
    if (!local) { navigate(`/start/${persona.id}`); return; }

    setInput('');
    const nextMessages: Msg[] = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextMessages);
    setStreaming(true);
    setMessages(m => [...m, { role: 'assistant', content: '', streaming: true }]);

    try {
      let acc = '';
      for await (const chunk of api.streamChat(local.sessionId, nextMessages.map(m => ({ role: m.role, content: m.content })))) {
        if (chunk.type === 'chunk') {
          acc += chunk.text;
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: acc, streaming: true };
            return copy;
          });
        } else if (chunk.type === 'done') {
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: acc, streaming: false };
            return copy;
          });
        } else if (chunk.type === 'error') {
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: `Sorry, something glitched. (${chunk.message})`, streaming: false };
            return copy;
          });
        }
      }
    } catch (err: any) {
      // Remove the placeholder that never got filled
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
      // Already authed — go straight to checkout
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
      <div className="chat-overlay" />

      <div className="chat-top">
        <button className="chat-back" onClick={() => navigate('/')} title="Back to home">←</button>
        <div className="chat-top-title">{persona.name}</div>
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
                    // Strip leading emoji cleanly — first non-space-non-letter block
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

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-bubble">
              {m.content || (m.streaming ? <span className="typing"><span /><span /><span /></span> : '')}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-box">
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
        <div className="chat-memory-badge">● Remembering everything about you</div>
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
                ? `I remember everything we talked about. Keep going for as little as ${formatPrice(persona.priceMonthly)}/mo.`
                : `We're just getting started. I already know so much about you — let's keep building.`
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
