import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../lib/api';
import * as sess from '../lib/session';
import './Auth.css';

export function AuthMagic() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const token = search.get('token');
  const sessionId = search.get('session') || undefined;
  const nextPath = search.get('next') || '/';

  const [mode, setMode] = useState<'input' | 'sent' | 'verifying'>(token ? 'verifying' : 'input');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If a token is in the URL, verify it
  useEffect(() => {
    if (!token) return;
    (async () => {
      const result = await api.verifyMagicToken(token);
      if (result.ok) {
        sess.saveAuth(result.data.token, result.data.user);
        navigate(nextPath);
      } else {
        setError(result.error);
        setMode('input');
      }
    })();
  }, [token, navigate, nextPath]);

  const handleSendMagicLink = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api.sendMagicLink(email.trim(), sessionId);
    setLoading(false);
    if (result.ok) {
      setMode('sent');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    alert('Google OAuth wire-up: add @react-oauth/google to package.json and render <GoogleLogin> — for MVP, use magic link first.');
  };

  return (
    <div className="auth">
      <div className="auth-card fade-in">
        <div className="auth-logo">my very own</div>

        {mode === 'verifying' && (
          <>
            <div className="spinner" style={{ margin: '40px auto' }} />
            <p className="auth-sub">Signing you in...</p>
          </>
        )}

        {mode === 'input' && (
          <>
            <h1 className="auth-title">Keep me with you</h1>
            <p className="auth-sub">I remember everything we’ve talked about. Let’s make it permanent.</p>

            <button className="auth-oauth" onClick={handleGoogleSignIn}>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>

            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMagicLink(); }}
              autoFocus
            />
            <button
              className="auth-cta"
              onClick={handleSendMagicLink}
              disabled={!email.trim() || loading}
            >
              {loading ? <span className="spinner" /> : 'Send me a magic link →'}
            </button>

            {error && <p className="auth-error">{error}</p>}
            <p className="auth-note">No password. We’ll email you a link that signs you in.</p>
          </>
        )}

        {mode === 'sent' && (
          <>
            <div className="auth-sent-emoji">✨</div>
            <h1 className="auth-title">Check your inbox</h1>
            <p className="auth-sub">We sent a magic link to <strong>{email}</strong>. Tap the link to sign in.</p>
            <button className="auth-skip" onClick={() => setMode('input')}>Send to different email</button>
          </>
        )}
      </div>
    </div>
  );
}
