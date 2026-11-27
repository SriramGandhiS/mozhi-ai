import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  RefreshCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  Square,
} from 'lucide-react';

interface OutputActionsProps {
  text: string;
  language: string;
  onRegenerate?: () => void;
  downloadFilename?: string;
}

export function OutputActions({
  text,
  language,
  onRegenerate,
  downloadFilename = 'translation.txt',
}: OutputActionsProps) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  if (!text) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleListen = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language === 'ta' ? 'ta-IN' : language;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lingua AI Translation', text });
      } catch {
        // user cancelled
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          title="Copy translation"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={handleListen}
          title={speaking ? 'Stop listening' : 'Listen'}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          {speaking ? <Square className="h-3.5 w-3.5 text-[var(--primary)]" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{speaking ? 'Stop' : 'Listen'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          title="Download TXT"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          title="Share"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            title="Regenerate translation"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setFeedback('up')}
          title="Good translation"
          className={`rounded-lg p-1.5 ${
            feedback === 'up' ? 'text-emerald-500' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFeedback('down')}
          title="Needs improvement"
          className={`rounded-lg p-1.5 ${
            feedback === 'down' ? 'text-rose-500' : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
