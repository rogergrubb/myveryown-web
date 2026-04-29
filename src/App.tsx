import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Home } from './pages/Home';
import { IntroTour } from './components/IntroTour';
import { trackVisit } from './lib/analytics';

// Lazy-load every route except Home — saves ~50KB from the main bundle
// on first paint. Each lazy chunk fetches only when navigated to.
const Onboard = lazy(() => import('./pages/Onboard').then(m => ({ default: m.Onboard })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const AuthMagic = lazy(() => import('./pages/AuthMagic').then(m => ({ default: m.AuthMagic })));
const Account = lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));

const RouteFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 30%, #1a1230 0%, #0c0820 60%, #04020e 100%)',
  }}>
    <div style={{
      width: 28, height: 28,
      border: '2px solid rgba(255,255,255,0.15)',
      borderTopColor: '#ec4899',
      borderRadius: '50%',
      animation: 'rt-spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes rt-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

function HomeWithTour() {
  const { pathname } = useLocation();
  return (
    <>
      <Home />
      {pathname === '/' && <IntroTour />}
    </>
  );
}

// Fires a single visit beacon every time the URL changes. Runs once
// per route mount (StrictMode double-mount in dev is OK — server
// dedupes by ip+ts within ~1s if needed; for prod traffic each beacon
// is one row).
function RouteTracker() {
  const { pathname } = useLocation();
  const params = useParams();
  useEffect(() => {
    const persona = (params as any).persona as string | undefined;
    trackVisit({ path: pathname, persona });
  }, [pathname, params]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Suspense fallback={<RouteFallback />}><Routes>
        <Route path="/" element={<HomeWithTour />} />
        <Route path="/start/:persona" element={<Onboard />} />
        {/* Shared-thread chat. /chat (no param) uses currentPersona from
            localStorage. /chat/:persona swaps the active voice and stays
            in the same conversation. */}
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:persona" element={<Chat />} />
        <Route path="/auth/magic" element={<AuthMagic />} />
        <Route path="/account" element={<Account />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}
