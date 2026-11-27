import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Star, Trash2, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [inputType, setInputType] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['history', search, inputType],
    queryFn: () => api.getHistory({ search: search || undefined, input_type: inputType || undefined }),
  });

  const favMutation = useMutation({
    mutationFn: api.toggleFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteHistoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  const clearMutation = useMutation({
    mutationFn: api.clearHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--text)]">Translation History</h1>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clearMutation.mutate()}
            className="rounded-xl border border-rose-500/30 px-3.5 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
          >
            Clear All History
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search translations..."
            className="w-full bg-transparent text-sm text-[var(--text)] outline-none"
          />
        </div>

        <select
          value={inputType}
          onChange={(e) => setInputType(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none"
        >
          <option value="">All Input Types</option>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
          <option value="document">Document</option>
          <option value="video">Video</option>
          <option value="website">Website</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading history...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-secondary)]">
          No translations in history yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)]/30"
            >
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--primary)]/10 px-2 py-0.5 font-medium uppercase text-[var(--primary)]">
                    {item.input_type}
                  </span>
                  <span>
                    {item.source_language.toUpperCase()} → {item.target_language.toUpperCase()}
                  </span>
                  <span>· {new Date(item.created_at).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.translated_text)}
                    className="rounded-lg p-1.5 hover:bg-[var(--bg)]"
                    title="Copy translation"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => favMutation.mutate(item.id)}
                    className="rounded-lg p-1.5 hover:bg-[var(--bg)]"
                    title="Favorite"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        item.is_favorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="rounded-lg p-1.5 hover:bg-[var(--bg)] hover:text-rose-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p className="tamil-text line-clamp-3 text-sm text-[var(--text-secondary)]">
                  {item.original_text}
                </p>
                <p className="tamil-text line-clamp-3 text-sm text-[var(--text)]">
                  {item.translated_text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
