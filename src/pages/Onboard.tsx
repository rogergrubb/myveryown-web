import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { saveSession } from '../lib/session';
import { getPersona } from '../lib/personas';
import './Onboard.css';

export function Onboard() {
  const { persona: personaId = 'kpop' } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageGate, setAgeGate] = useState<{ required: boolean; ageGate?: string }>({ required: false });
  const [ageVerified, setAgeVerified] = useState(false);
  const persona = getPersona(personaId);

  useEffect(() => {
    document.body.setAttribute('data-persona', persona.id);
    return () => document.body.removeAttribute('data-persona');
  }, [persona.id]);

  const handleStart = async () => {
    if (!name.trim()) return;
    if (persona.ageGate && !ageVerified) {
      setAgeGate({ required: true, ageGate: persona.ageGate });
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api.createSession(persona.id, name.trim(), ageVerified);
    if (!result.ok) {
      // Handle server-side age gate trip (defense in depth)
      if ((result as any).code === 'AGE_GATE_REQUIRED' || /AGE_GATE/.test(result.error)) {
        setAgeGate({ required: true, ageGate: persona.ageGate });
        setLoading(false);
        return;
      }
      setError(result.error);
      setLoading(false);
      return;
    }
    saveSession({
      sessionId: result.data.sessionId,
      persona: persona.id,
      name: name.trim(),
      expiresAt: result.data.expiresAt,
    });
    navigate(`/chat/${persona.id}`);
  };

  return (
    <div
      className="onboard"
      style={{ background: persona.bg, '--accent': persona.accent, '--accent-rgb': persona.accentRgb } as any}
    >
      <div className="onboard-overlay" />
      <div className="onboard-card fade-in">
        <div className="onboard-tag">
          {persona.ageGate && <span className="age-badge">{persona.ageGate}</span>}{persona.tag}
        </div>
        <h1 className="onboard-greeting">{persona.greeting}</h1>
        <p className="onboard-sub">I’ll remember this. I’ll remember everything.</p>
        <div className="onboard-input-row">
          <input
            autoFocus
            className="onboard-input"
            value={name}
            placeholder="Your name"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
            maxLength={40}
          />
        </div>
        <button
          className="onboard-cta"
          disabled={!name.trim() || loading}
          onClick={handleStart}
        >
          {loading ? <span className="spinner" /> : `Nice to meet you${name.trim() ? `, ${name.trim()}` : ''} →`}
        </button>
        {error && <p className="onboard-error">{error}</p>}
        <div className="onboard-note">7 days free · No credit card · No account needed</div>
      </div>

      {ageGate.required && (
        <div className="onboard-agegate-backdrop" onClick={() => setAgeGate({ required: false })}>
          <div className="onboard-agegate-card" onClick={e => e.stopPropagation()}>
            <div className="onboard-agegate-tag">{ageGate.ageGate}</div>
            <h2>Confirm you are an adult</h2>
            <p>
              {persona.name} is an adult companion. By continuing you confirm you are
              <strong> 18 years or older</strong>. Anyone under 18 should choose a different persona.
            </p>
            <div className="onboard-agegate-actions">
              <button
                className="onboard-agegate-confirm"
                onClick={() => {
                  setAgeVerified(true);
                  setAgeGate({ required: false });
                  setTimeout(() => handleStart(), 50);
                }}
              >
                Yes, I am 18+
              </button>
              <button
                className="onboard-agegate-cancel"
                onClick={() => navigate('/')}
              >
                No, take me home
              </button>
            </div>
            <div className="onboard-agegate-fineprint">
              You can review the <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and{' '}
              <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> first.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
