import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../lib/api';
import * as sess from '../lib/session';
import './Auth.css';

export function Account() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const subscribed = search.get('subscribed');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const auth = sess.getAuth();
      if (!auth) {
        navigate('/auth/magic');
        return;
      }
      const result = await api.getMe();
      if (result.ok) {
        setUser(result.data.user);
      } else {
        setError(result.error);
        sess.clearAuth();
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleSubscribe = async (persona: string, cadence: 'monthly' | 'annual') => {
    const result = await api.startCheckout(persona, cadence);
    if (result.ok && result.data.url) {
      window.location.href = result.data.url;
    } else if (!result.ok) {
      setError(result.error);
    }
  };

  if (loading) {
    return <div className="auth"><div className="auth-card"><div className="spinner" style={{ margin: '40px auto' }} /></div></div>;
  }

  return (
    <div className="auth">
      <div className="auth-card fade-in">
        <div className="auth-logo">my very own</div>
        {subscribed && (
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(64,255,160,0.1)', border: '1px solid rgba(64,255,160,0.3)', color: '#40ffa0', fontSize: '13px', marginBottom: '20px' }}>
            ✨ Welcome! Your subscription to {subscribed} is active.
          </div>
        )}
        <h1 className="auth-title">Hello, {user?.displayName || user?.email}</h1>
        <p className="auth-sub">{user?.email}</p>

        <div style={{ marginTop: 32, textAlign: 'left' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14 }}>Your personas</h3>
          <button
            className="auth-cta"
            style={{ marginBottom: 10 }}
            onClick={() => navigate('/chat/kpop')}
          >
            💜 Continue with Bias Wrecker
          </button>
          <button
            className="auth-skip"
            style={{ display: 'block', margin: '16px auto' }}
            onClick={() => { sess.clearAuth(); sess.clearSession(); navigate('/'); }}
          >
            Sign out
          </button>
        </div>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
