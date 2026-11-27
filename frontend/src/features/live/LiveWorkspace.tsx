import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Pause, Play, Square } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { OutputActions } from '../../components/OutputActions';

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1`;

export function LiveWorkspace() {
  const { sourceLanguage, targetLanguage, style, setDetectedLanguage } = useAppStore();
  const [status, setStatus] = useState<'idle' | 'listening' | 'paused'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [originalLines, setOriginalLines] = useState<string[]>([]);
  const [translatedLines, setTranslatedLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (status !== 'listening') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const stopSession = () => {
    recognitionRef.current?.stop();
    wsRef.current?.close();
    setStatus('idle');
  };

  const startSession = async () => {
    setError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Your browser does not support Web Speech Recognition. Please use Chrome or Edge.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone permission denied. Please allow microphone access to use Live Translator.');
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/live/translate`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'ok') {
        setTranslatedLines((prev) => [...prev, data.translated_text]);
        if (data.detected_language) setDetectedLanguage(data.detected_language);
      } else if (data.status === 'error') {
        setError(data.detail);
      }
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = sourceLanguage === 'ta' ? 'ta-IN' : sourceLanguage === 'auto' ? 'ta-IN' : sourceLanguage;

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text) {
          setOriginalLines((prev) => [...prev, text]);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                text,
                source_language: sourceLanguage,
                target_language: targetLanguage,
                style,
              })
            );
          }
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        setError(`Speech recognition error: ${e.error}`);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setSeconds(0);
    setStatus('listening');
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Central Microphone Control */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <button
          type="button"
          onClick={status === 'idle' ? startSession : stopSession}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 ${
            status === 'listening' ? 'animate-pulse bg-rose-500' : 'bg-[var(--primary)]'
          }`}
          aria-label={status === 'idle' ? 'Start Recording' : 'Stop Recording'}
        >
          {status === 'listening' ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>

        <div className="mt-3 flex items-center gap-3 text-sm font-medium text-[var(--text)]">
          <span>
            {status === 'idle'
              ? 'Tap to start live translation'
              : status === 'listening'
              ? 'Listening...'
              : 'Paused'}
          </span>
          {status !== 'idle' && (
            <span className="rounded-md bg-[var(--bg)] px-2 py-0.5 font-mono text-xs text-[var(--primary)]">
              {formatTime(seconds)}
            </span>
          )}
        </div>

        {status !== 'idle' && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (status === 'listening') {
                  recognitionRef.current?.stop();
                  setStatus('paused');
                } else {
                  recognitionRef.current?.start();
                  setStatus('listening');
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)]"
            >
              {status === 'listening' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{status === 'listening' ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              type="button"
              onClick={stopSession}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-500"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-500">{error}</p>
        )}
      </div>

      {/* Live Transcript Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-[240px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            Original Speech Transcript
          </span>
          <div className="tamil-text flex-1 space-y-2 overflow-y-auto text-sm text-[var(--text)]">
            {originalLines.length === 0 ? (
              <span className="text-[var(--text-secondary)]/60">Speak into your microphone...</span>
            ) : (
              originalLines.map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
        </div>

        <div className="flex min-h-[240px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <span className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            Live Translated Transcript
          </span>
          <div className="tamil-text flex-1 space-y-2 overflow-y-auto text-sm text-[var(--text)]">
            {translatedLines.length === 0 ? (
              <span className="text-[var(--text-secondary)]/60">Live translation will appear here...</span>
            ) : (
              translatedLines.map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
          <OutputActions
            text={translatedLines.join('\n')}
            language={targetLanguage}
            downloadFilename="live-translation.txt"
          />
        </div>
      </div>
    </div>
  );
}
