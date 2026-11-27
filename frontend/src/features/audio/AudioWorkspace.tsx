import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileAudio, Loader2, RefreshCw, Trash2, Download } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import type { TimestampedSegment } from '../../types/translation';
import { OutputActions } from '../../components/OutputActions';

export function AudioWorkspace() {
  const { sourceLanguage, targetLanguage, style, pendingFile, setPendingFile, setDetectedLanguage } =
    useAppStore();

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [translated, setTranslated] = useState('');
  const [segments, setSegments] = useState<TimestampedSegment[]>([]);
  const [srt, setSrt] = useState('');
  const [vtt, setVtt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processAudio = async (selected: File) => {
    setFile(selected);
    setAudioUrl(URL.createObjectURL(selected));
    setLoading(true);
    setError(null);
    try {
      const res = await api.translateAudio({
        file: selected,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setTranscript(res.original_content);
      setTranslated(res.translated_content);
      setSegments(res.segments || []);
      setSrt(res.metadata?.srt || '');
      setVtt(res.metadata?.vtt || '');
      setDetectedLanguage(res.detected_language);
    } catch (err: any) {
      setError(err.message || 'Audio transcription failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingFile) {
      processAudio(pendingFile);
      setPendingFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  const handleRetranslateTranscript = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.translateText({
        text: transcript,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setTranslated(res.translated_content);
    } catch (err: any) {
      setError(err.message || 'Retranslation failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted[0]) processAudio(accepted[0]);
    },
  });

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
              : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50'
          }`}
        >
          <input {...getInputProps()} />
          <FileAudio className="mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Drop an audio recording here, or click to upload
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Supports MP3, WAV, M4A, AAC, OGG, FLAC, WEBM — Tamil & multilingual speech
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text)]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setAudioUrl(null);
                    setTranscript('');
                    setTranslated('');
                    setSegments([]);
                  }}
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left: Editable Transcript */}
            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Original Transcript (Editable)
                </span>
                <button
                  type="button"
                  onClick={handleRetranslateTranscript}
                  disabled={loading || !transcript.trim()}
                  className="flex items-center gap-1 rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 disabled:opacity-40"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-translate</span>
                </button>
              </div>

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={8}
                placeholder={loading ? 'Transcribing audio...' : 'Transcript will appear here...'}
                className="tamil-text w-full flex-1 resize-none bg-transparent text-sm text-[var(--text)] outline-none"
              />
            </div>

            {/* Right: Translation + Subtitles */}
            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Translation</span>
                <div className="flex items-center gap-1">
                  {srt && (
                    <button
                      type="button"
                      onClick={() => downloadFile(srt, `${file.name}.srt`)}
                      className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text)]"
                    >
                      <Download className="h-3 w-3" /> SRT
                    </button>
                  )}
                  {vtt && (
                    <button
                      type="button"
                      onClick={() => downloadFile(vtt, `${file.name}.vtt`)}
                      className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text)]"
                    >
                      <Download className="h-3 w-3" /> VTT
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center gap-2 py-10 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  <span>Processing audio...</span>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
                  {error}
                </div>
              ) : (
                <div className="tamil-text flex-1 whitespace-pre-wrap text-sm text-[var(--text)]">
                  {translated}
                </div>
              )}

              <OutputActions
                text={translated}
                language={targetLanguage}
                onRegenerate={handleRetranslateTranscript}
                downloadFilename={`${file.name}-translated.txt`}
              />
            </div>
          </div>

          {segments.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Timestamped Segments
              </h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {segments.map((seg, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 rounded-xl bg-[var(--bg)] p-2.5 text-xs sm:grid-cols-2">
                    <div>
                      <span className="mr-2 font-mono text-[11px] text-[var(--primary)]">
                        [{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s]
                      </span>
                      {seg.speaker && <span className="mr-1.5 font-semibold">{seg.speaker}:</span>}
                      <span className="tamil-text text-[var(--text)]">{seg.original_text}</span>
                    </div>
                    <div className="tamil-text text-[var(--text-secondary)]">{seg.translated_text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
