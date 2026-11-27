import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Video, Loader2, Trash2, Download } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { OutputActions } from '../../components/OutputActions';

export function VideoWorkspace() {
  const { sourceLanguage, targetLanguage, style, pendingFile, setPendingFile, setDetectedLanguage } =
    useAppStore();

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [translated, setTranslated] = useState('');
  const [srt, setSrt] = useState('');
  const [vtt, setVtt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processVideo = async (selected: File) => {
    setFile(selected);
    setVideoUrl(URL.createObjectURL(selected));
    setLoading(true);
    setError(null);
    try {
      const res = await api.translateVideo({
        file: selected,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setTranscript(res.original_content);
      setTranslated(res.translated_content);
      setSrt(res.metadata?.srt || '');
      setVtt(res.metadata?.vtt || '');
      setDetectedLanguage(res.detected_language);
    } catch (err: any) {
      setError(err.message || 'Video translation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingFile) {
      processVideo(pendingFile);
      setPendingFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

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
    accept: { 'video/*': ['.mp4', '.webm', '.mov', '.mkv'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted[0]) processVideo(accepted[0]);
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
          <Video className="mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Drop a video file here, or click to upload
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Supports MP4, WEBM, MOV, MKV — Extracts audio via FFmpeg & generates translated subtitles
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setVideoUrl(null);
                    setTranscript('');
                    setTranslated('');
                  }}
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {videoUrl && (
                <video controls src={videoUrl} className="max-h-72 w-full rounded-xl bg-black" />
              )}
              {transcript && (
                <div className="mt-3 rounded-xl bg-[var(--bg)] p-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                    Original Transcript
                  </div>
                  <p className="tamil-text max-h-36 overflow-y-auto text-xs text-[var(--text)]">
                    {transcript}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Translated Subtitles & Script
                </span>
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
                <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  <span>Extracting audio & translating video...</span>
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
                onRegenerate={() => file && processVideo(file)}
                downloadFilename={`${file.name}-translated.txt`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
