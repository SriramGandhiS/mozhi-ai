export type InputMode = 'text' | 'image' | 'audio' | 'document' | 'video' | 'website' | 'live';

export type TranslationStyle =
  | 'Natural'
  | 'Literal'
  | 'Professional'
  | 'Casual'
  | 'Academic'
  | 'Simplified';

export interface LanguageInfo {
  code: string;
  name: string;
  native_name: string;
  script: string;
  rtl: boolean;
  providers: string[];
  priority: number;
}

export interface TimestampedSegment {
  start: number;
  end: number;
  original_text: string;
  translated_text: string;
  speaker?: string | null;
  uncertain?: boolean;
}

export interface TranslationResponse {
  request_id: string;
  status: string;
  detected_language: string;
  target_language: string;
  original_content: string;
  translated_content: string;
  segments?: TimestampedSegment[] | null;
  processing_duration_ms: number;
  warnings: string[];
  download_url?: string | null;
  provider: string;
  metadata?: Record<string, any> | null;
}

export interface JobStatusResponse {
  job_id: string;
  job_type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  status_message?: string | null;
  result?: TranslationResponse | null;
  error_message?: string | null;
}

export interface HistoryItem {
  id: string;
  input_type: InputMode;
  source_language: string;
  target_language: string;
  original_text: string;
  translated_text: string;
  translation_style: TranslationStyle;
  provider: string;
  is_favorite: boolean;
  created_at: string;
}
