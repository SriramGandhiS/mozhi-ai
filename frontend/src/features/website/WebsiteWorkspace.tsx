import { useState } from 'react';
import { Globe, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { OutputActions } from '../../components/OutputActions';

export function WebsiteWorkspace() {
  const { sourceLanguage, targetLanguage, style, setDetectedLanguage } = useAppStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.translateWebsite({
        url: url.trim(),
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setTitle(res.metadata?.title || null);
      setTranslated(res.translated_content);
      setDetectedLanguage(res.detected_language);
    } catch (err: any) {
      setError(err.message || 'Failed to translate website.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleTranslate}
        className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <Globe className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Translate Article</span>
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      {translated && (
        <article className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              {title && <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
              >
                <span>Original source</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="tamil-text whitespace-pre-wrap text-base leading-relaxed text-[var(--text)]">
            {translated}
          </div>

          <div className="mt-6">
            <OutputActions text={translated} language={targetLanguage} downloadFilename="article-translated.txt" />
          </div>
        </article>
      )}
    </div>
  );
}
