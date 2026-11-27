import { UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import type { InputMode } from '../types/translation';

export function detectModeFromFile(file: File): InputMode | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type.toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'heic'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    return 'video';
  }
  if (['pdf', 'docx', 'pptx', 'xlsx', 'txt'].includes(ext) || mime === 'application/pdf') {
    return 'document';
  }
  return null;
}

export function UniversalUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setActiveMode, setPendingFile } = useAppStore();

  const handleFile = (file: File) => {
    const mode = detectModeFromFile(file);
    if (!mode) {
      alert(`Unsupported file type: ${file.name}`);
      return;
    }
    setPendingFile(file);
    setActiveMode(mode);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,audio/*,video/*,.pdf,.docx,.pptx,.xlsx,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
      >
        <UploadCloud className="h-4 w-4 text-[var(--primary)]" />
        <span>Smart Upload</span>
      </button>
    </>
  );
}
