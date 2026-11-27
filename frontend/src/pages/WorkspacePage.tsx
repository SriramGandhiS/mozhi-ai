import { useQuery } from '@tanstack/react-query';
import {
  FileAudio,
  FileText,
  Globe,
  Image as ImageIcon,
  Mic,
  Type,
  Video,
} from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../stores/useAppStore';
import type { InputMode } from '../types/translation';
import { LanguageBar } from '../components/LanguageBar';
import { UniversalUploadButton } from '../components/UniversalDropzone';
import { TextWorkspace } from '../features/text/TextWorkspace';
import { ImageWorkspace } from '../features/image/ImageWorkspace';
import { AudioWorkspace } from '../features/audio/AudioWorkspace';
import { DocumentWorkspace } from '../features/document/DocumentWorkspace';
import { VideoWorkspace } from '../features/video/VideoWorkspace';
import { WebsiteWorkspace } from '../features/website/WebsiteWorkspace';
import { LiveWorkspace } from '../features/live/LiveWorkspace';

const MODES: { id: InputMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: FileAudio },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'live', label: 'Live', icon: Mic },
];

export function WorkspacePage({ forceMode }: { forceMode?: InputMode }) {
  const { activeMode, setActiveMode } = useAppStore();
  const currentMode = forceMode || activeMode;

  const { data: languages = [] } = useQuery({
    queryKey: ['languages'],
    queryFn: api.getLanguages,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-4 py-6 sm:px-6">
      {/* Small Heading + Smart Upload */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
          Translate anything. Understand everything.
        </h1>
        <UniversalUploadButton />
      </div>

      {/* Input Mode Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = currentMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveMode(m.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Language Selection Bar */}
      <LanguageBar languages={languages} />

      {/* Active Translation Module */}
      <div>
        {currentMode === 'text' && <TextWorkspace />}
        {currentMode === 'image' && <ImageWorkspace />}
        {currentMode === 'audio' && <AudioWorkspace />}
        {currentMode === 'document' && <DocumentWorkspace />}
        {currentMode === 'video' && <VideoWorkspace />}
        {currentMode === 'website' && <WebsiteWorkspace />}
        {currentMode === 'live' && <LiveWorkspace />}
      </div>
    </main>
  );
}
