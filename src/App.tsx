import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Onboard } from './pages/Onboard';
import { Chat } from './pages/Chat';
import { AuthMagic } from './pages/AuthMagic';
import { Account } from './pages/Account';
import { IntroTour } from './components/IntroTour';

function HomeWithTour() {
  // Tour mounts on `/` only — see IntroTour for trigger logic + storage.
  const { pathname } = useLocation();
  return (
    <>
      <Home />
      {pathname === '/' && <IntroTour />}
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeWithTour />} />
        <Route path="/start/:persona" element={<Onboard />} />
        <Route path="/chat/:persona" element={<Chat />} />
        <Route path="/auth/magic" element={<AuthMagic />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
