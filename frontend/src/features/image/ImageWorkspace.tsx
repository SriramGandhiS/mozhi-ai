import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Loader2, RotateCw, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { OutputActions } from '../../components/OutputActions';

type ImageViewMode = 'text' | 'side-by-side' | 'overlay';

export function ImageWorkspace() {
  const { sourceLanguage, targetLanguage, style, pendingFile, setPendingFile, setDetectedLanguage } =
    useAppStore();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<ImageViewMode>('side-by-side');
  const [extractedText, setExtractedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (selected: File) => {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setLoading(true);
    setError(null);
    try {
      const res = await api.translateImage({
        file: selected,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setExtractedText(res.original_content);
      setTranslatedText(res.translated_content);
      setDetectedLanguage(res.detected_language);
    } catch (err: any) {
      setError(err.message || 'Image OCR/translation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingFile) {
      processFile(pendingFile);
      setPendingFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted[0]) processFile(accepted[0]);
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
          <ImageIcon className="mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Drop an image here, or click to upload
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Supports JPG, PNG, WEBP, BMP, HEIC — Tamil newspapers, menus, signboards, screenshots
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text)]">{file.name}</span>
              <span>({(file.size / 1024).toFixed(1)} KB)</span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['text', 'side-by-side', 'overlay'] as ImageViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize ${
                    viewMode === m
                      ? 'bg-[var(--primary)] text-white'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  {m.replace('-', ' ')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setExtractedText('');
                  setTranslatedText('');
                }}
                className="ml-2 rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:text-rose-500"
                title="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {viewMode !== 'text' && previewUrl && (
              <div className="relative flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Original Image</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="relative flex max-h-[400px] flex-1 items-center justify-center overflow-auto rounded-xl bg-[var(--bg)] p-2">
                  <img
                    src={previewUrl}
                    alt="Uploaded"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    className="max-h-full max-w-full object-contain transition-transform"
                  />
                  {viewMode === 'overlay' && translatedText && (
                    <div className="tamil-text absolute inset-x-3 bottom-3 max-h-40 overflow-y-auto rounded-xl bg-black/75 p-3 text-xs text-white backdrop-blur-sm">
                      {translatedText}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              className={`flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${
                viewMode === 'text' ? 'lg:col-span-2' : ''
              }`}
            >
              <span className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                Extracted & Translated Text
              </span>

              {loading ? (
                <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  <span>Extracting text and translating...</span>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
                  {error}
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3">
                  {extractedText && (
                    <div className="rounded-xl bg-[var(--bg)] p-3">
                      <div className="mb-1 text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                        Extracted Original
                      </div>
                      <p className="tamil-text whitespace-pre-wrap text-sm text-[var(--text)]">
                        {extractedText}
                      </p>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="mb-1 text-[11px] font-semibold uppercase text-[var(--text-secondary)]">
                      Translation
                    </div>
                    <p className="tamil-text whitespace-pre-wrap text-sm text-[var(--text)]">
                      {translatedText}
                    </p>
                  </div>
                </div>
              )}

              <OutputActions
                text={translatedText}
                language={targetLanguage}
                onRegenerate={() => file && processFile(file)}
                downloadFilename={`${file.name}-translated.txt`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
