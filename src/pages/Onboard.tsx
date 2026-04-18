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
  const persona = getPersona(personaId);

  useEffect(() => {
    document.body.setAttribute('data-persona', persona.id);
    return () => document.body.removeAttribute('data-persona');
  }, [persona.id]);

  const handleStart = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const result = await api.createSession(persona.id, name.trim());
    if (!result.ok) {
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
        <div className="onboard-note">48 hours free · No credit card · No account needed</div>
      </div>
    </div>
  );
}
