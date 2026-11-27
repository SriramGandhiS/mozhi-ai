import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Loader2, Mic, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import type { TranslationStyle } from '../../types/translation';
import { OutputActions } from '../../components/OutputActions';

const STYLES: TranslationStyle[] = [
  'Natural',
  'Literal',
  'Professional',
  'Casual',
  'Academic',
  'Simplified',
];

export function TextWorkspace() {
  const {
    sourceLanguage,
    targetLanguage,
    style,
    setStyle,
    setDetectedLanguage,
    historyEnabled,
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runTranslation = async (textToTranslate: string) => {
    if (!textToTranslate.trim()) {
      setOutputText('');
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await api.translateText({
        text: textToTranslate,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
        save_history: historyEnabled,
        signal: controller.signal,
      });
      setOutputText(res.translated_content);
      setDetectedLanguage(res.detected_language);
      setDurationMs(res.processing_duration_ms);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Translation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced instant translation
  useEffect(() => {
    if (!inputText.trim()) {
      setOutputText('');
      return;
    }
    const timer = setTimeout(() => {
      runTranslation(inputText);
    }, 650);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, sourceLanguage, targetLanguage, style]);

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setInputText(clip);
    } catch {
      // clipboard permission denied
    }
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      {/* Style Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Style:</span>
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                style === s
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => runTranslation(inputText)}
          disabled={loading || !inputText.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>Translate</span>
        </button>
      </div>

      {/* Two-panel workspace */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Panel: Original */}
        <div className="flex min-h-[280px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Original</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePaste}
                title="Paste from clipboard"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>Paste</span>
              </button>
              {inputText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText('');
                    setOutputText('');
                    setError(null);
                  }}
                  title="Clear text"
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text in Tamil, Tanglish, English, or any supported language..."
            className="tamil-text w-full flex-1 resize-none bg-transparent text-base text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)]/60"
          />

          <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-xs text-[var(--text-secondary)]">
            <span>
              {inputText.length} chars · {wordCount} words
            </span>
            <span className="flex items-center gap-1 text-[11px]">
              <Mic className="h-3 w-3" /> Supports Tamil script & Tanglish
            </span>
          </div>
        </div>

        {/* Right Panel: Translated */}
        <div className="flex min-h-[280px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Translation</span>
            {durationMs !== null && !loading && outputText && (
              <span className="text-[11px] text-[var(--text-secondary)]">{durationMs} ms</span>
            )}
          </div>

          <div className="tamil-text flex-1 whitespace-pre-wrap text-base text-[var(--text)]">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                <span>Translating...</span>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </div>
            ) : outputText ? (
              outputText
            ) : (
              <span className="text-[var(--text-secondary)]/60">Translation will appear here...</span>
            )}
          </div>

          <OutputActions
            text={outputText}
            language={targetLanguage}
            onRegenerate={() => runTranslation(inputText)}
          />
        </div>
      </div>
    </div>
  );
}
