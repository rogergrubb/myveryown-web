import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Home } from './pages/Home';
import { Onboard } from './pages/Onboard';
import { Chat } from './pages/Chat';
import { AuthMagic } from './pages/AuthMagic';
import { Account } from './pages/Account';
import { IntroTour } from './components/IntroTour';
import { Dashboard } from './pages/Dashboard';
import { trackVisit } from './lib/analytics';

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
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
}
