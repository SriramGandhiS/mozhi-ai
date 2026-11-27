import { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme, historyEnabled, setHistoryEnabled } = useAppStore();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Settings & Privacy</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-secondary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text)]">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[var(--text)]"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text)]">Save Translation History</p>
              <p className="text-xs text-[var(--text-secondary)]">Store recent translations</p>
            </div>
            <input
              type="checkbox"
              checked={historyEnabled}
              onChange={(e) => setHistoryEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary)]"
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-xs text-[var(--text-secondary)]">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-[var(--text)]">
              <ShieldAlert className="h-4 w-4 text-[var(--primary)]" />
              <span>AI Processing Notice</span>
            </div>
            Uploaded text, images, audio, and documents are sent securely to configured AI providers
            for translation and are not permanently retained by default.
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('');

  if (!open) return null;

  const handleGuestOrDemo = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({
      uid: 'local-user',
      email: email || 'guest@lingua-ai.local',
      displayName: email ? email.split('@')[0] : 'Guest User',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text)]">Sign In</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--text-secondary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleGuestOrDemo} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--border)] py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text)]"
          >
            Continue as Guest
          </button>
        </form>
      </div>
    </div>
  );
}
