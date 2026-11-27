import { Link, useLocation } from 'react-router-dom';
import { Languages, Moon, Sun, Settings, History, Mic, User, LogOut } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export function Header({ onOpenSettings, onOpenAuth }: HeaderProps) {
  const { appName, theme, toggleTheme, user, setUser, setActiveMode } = useAppStore();
  const location = useLocation();

  const navItems = [
    { label: 'Translate', path: '/', icon: Languages, onClick: () => setActiveMode('text') },
    { label: 'Live Translator', path: '/live', icon: Mic, onClick: () => setActiveMode('live') },
    { label: 'History', path: '/history', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        {/* Left: Logo + Brand */}
        <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <svg className="h-7 w-7 text-[var(--text)]" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M16 2.5 29.5 16 16 29.5 2.5 16 16 2.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M16 9.5 22.5 16 16 22.5 9.5 16 16 9.5Z" fill="currentColor" />
          </svg>
          <span className="text-xl font-semibold tracking-tight text-[var(--text)]">{appName}</span>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={item.onClick}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Theme, Settings, Auth */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            <Settings className="h-4 w-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-medium text-[var(--text)] sm:inline">
                {user.displayName || user.email || 'User'}
              </span>
              <button
                onClick={() => setUser(null)}
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg)]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <User className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="flex items-center justify-around border-t border-[var(--border)] py-1.5 md:hidden">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.onClick}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                active ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
