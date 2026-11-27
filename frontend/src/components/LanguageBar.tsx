import { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, ChevronDown, Search, Star, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import type { LanguageInfo } from '../types/translation';

interface LanguageDropdownProps {
  value: string;
  onChange: (code: string) => void;
  languages: LanguageInfo[];
  allowAuto?: boolean;
  label: string;
}

function LanguageDropdown({ value, onChange, languages, allowAuto, label }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { recentLanguages, favoriteLanguages, toggleFavoriteLanguage } = useAppStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected =
    value === 'auto'
      ? { code: 'auto', name: 'Auto Detect', native_name: 'Detect language' }
      : languages.find((l) => l.code === value) || { code: value, name: value.toUpperCase(), native_name: '' };

  const filtered = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.native_name.toLowerCase().includes(query.toLowerCase()) ||
      l.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-left text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)]/50"
      >
        <div className="flex items-center gap-2 truncate">
          {value === 'auto' && <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
          <span className="truncate">{selected.name}</span>
          {selected.native_name && value !== 'auto' && (
            <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">
              ({selected.native_name})
            </span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <Search className="h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search language..."
              autoFocus
              className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {allowAuto && !query && (
              <button
                type="button"
                onClick={() => {
                  onChange('auto');
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  value === 'auto'
                    ? 'bg-[var(--primary)]/10 font-medium text-[var(--primary)]'
                    : 'text-[var(--text)] hover:bg-[var(--bg)]'
                }`}
              >
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                <span>Auto Detect</span>
              </button>
            )}

            {!query && recentLanguages.length > 0 && (
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Recent
              </div>
            )}

            {filtered.map((lang) => {
              const isFav = favoriteLanguages.includes(lang.code);
              return (
                <div
                  key={lang.code}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    value === lang.code
                      ? 'bg-[var(--primary)]/10 font-medium text-[var(--primary)]'
                      : 'text-[var(--text)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(lang.code);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span>{lang.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{lang.native_name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteLanguage(lang.code);
                    }}
                    aria-label="Favorite language"
                    className="p-1 text-[var(--text-secondary)] hover:text-amber-500"
                  >
                    <Star className={`h-3.5 w-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function LanguageBar({ languages }: { languages: LanguageInfo[] }) {
  const {
    sourceLanguage,
    targetLanguage,
    detectedLanguage,
    setSourceLanguage,
    setTargetLanguage,
    swapLanguages,
  } = useAppStore();

  const canSwap = sourceLanguage !== 'auto' || Boolean(detectedLanguage);
  const detectedName = detectedLanguage
    ? languages.find((l) => l.code === detectedLanguage)?.name || detectedLanguage.toUpperCase()
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageDropdown
          label="Source Language"
          value={sourceLanguage}
          onChange={setSourceLanguage}
          languages={languages}
          allowAuto
        />

        <button
          type="button"
          onClick={swapLanguages}
          disabled={!canSwap}
          title={canSwap ? 'Swap languages' : 'Detect a language first to swap'}
          aria-label="Swap languages"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <LanguageDropdown
          label="Target Language"
          value={targetLanguage}
          onChange={setTargetLanguage}
          languages={languages}
        />
      </div>

      {sourceLanguage === 'auto' && detectedName && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
          <span>
            Detected: <strong className="text-[var(--text)]">{detectedName}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
