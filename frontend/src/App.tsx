import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { AuthModal, SettingsModal } from './components/Modals';
import { WorkspacePage } from './pages/WorkspacePage';
import { HistoryPage } from './pages/HistoryPage';
import { useAppStore } from './stores/useAppStore';

const queryClient = new QueryClient();

export default function App() {
  const { theme } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
          {theme === 'light' && (
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_223518_f11bfa03-4e65-47e1-a4a7-30e42a7a8c2f.png&w=1920&q=85"
                className="h-full w-full object-cover"
              >
                <source
                  type="video/mp4"
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260831_232706_43757be4-2250-4f09-8cd7-23aebbf147ad.mp4"
                />
              </video>
            </div>
          )}
          <div className="relative z-10">
            <Header
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenAuth={() => setAuthOpen(true)}
            />
            <Routes>
              <Route path="/" element={<WorkspacePage />} />
              <Route path="/live" element={<WorkspacePage forceMode="live" />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </div>
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
