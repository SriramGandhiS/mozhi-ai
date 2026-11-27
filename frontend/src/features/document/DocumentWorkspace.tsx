import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Loader2, Trash2, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { OutputActions } from '../../components/OutputActions';

export function DocumentWorkspace() {
  const { sourceLanguage, targetLanguage, style, pendingFile, setPendingFile, setDetectedLanguage } =
    useAppStore();

  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDocumentJob = async (selected: File) => {
    setFile(selected);
    setLoading(true);
    setError(null);
    setProgress(5);
    setStatusMessage('Uploading document...');
    try {
      const res = await api.startDocumentTranslation({
        file: selected,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        style,
      });
      setJobId(res.job_id);
    } catch (err: any) {
      setError(err.message || 'Failed to start document translation.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingFile) {
      startDocumentJob(pendingFile);
      setPendingFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile]);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const job = await api.getJobStatus(jobId);
        setProgress(job.progress);
        setStatusMessage(job.status_message || job.status);
        if (job.status === 'completed' && job.result) {
          setOriginalText(job.result.original_content);
          setTranslatedText(job.result.translated_content);
          setWarnings(job.result.warnings || []);
          setDetectedLanguage(job.result.detected_language);
          setLoading(false);
          setJobId(null);
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          setError(job.error_message || `Job ${job.status}`);
          setLoading(false);
          setJobId(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to poll job status.');
        setLoading(false);
        setJobId(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [jobId, setDetectedLanguage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted[0]) startDocumentJob(accepted[0]);
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
          <FileText className="mb-3 h-10 w-10 text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--text)]">
            Drop a document here, or click to upload
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Supports PDF (including scanned PDFs with OCR), DOCX, PPTX, XLSX, TXT
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{file.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex items-center gap-2">
              {loading && jobId && (
                <button
                  type="button"
                  onClick={() => api.cancelJob(jobId)}
                  className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs text-rose-500"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setOriginalText('');
                  setTranslatedText('');
                  setJobId(null);
                }}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  {statusMessage}
                </span>
                <span className="text-[var(--text-secondary)]">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg)]">
                <div
                  className="h-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              {warnings.join(' ')}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-500">
              {error}
            </div>
          )}

          {(originalText || translatedText) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex max-h-[460px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                  Original Document Content
                </span>
                <div className="tamil-text flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--text)]">
                  {originalText}
                </div>
              </div>

              <div className="flex max-h-[460px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                  Translated Document
                </span>
                <div className="tamil-text flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-[var(--text)]">
                  {translatedText}
                </div>
                <OutputActions
                  text={translatedText}
                  language={targetLanguage}
                  onRegenerate={() => file && startDocumentJob(file)}
                  downloadFilename={`${file.name}-translated.txt`}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
