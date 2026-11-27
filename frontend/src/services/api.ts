import type {
  HistoryItem,
  JobStatusResponse,
  LanguageInfo,
  TranslationResponse,
  TranslationStyle,
} from '../types/translation';
import { useAppStore } from '../stores/useAppStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = useAppStore.getState().user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  async getLanguages(): Promise<LanguageInfo[]> {
    const res = await fetch(`${API_BASE}/languages`);
    const data = await handleResponse<{ languages: LanguageInfo[] }>(res);
    return data.languages;
  },

  async translateText(params: {
    text: string;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
    save_history?: boolean;
    signal?: AbortSignal;
  }): Promise<TranslationResponse> {
    const { signal, ...body } = params;
    const res = await fetch(`${API_BASE}/translate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
      signal,
    });
    return handleResponse<TranslationResponse>(res);
  },

  async translateImage(params: {
    file: File;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
  }): Promise<TranslationResponse> {
    const form = new FormData();
    form.append('file', params.file);
    form.append('source_language', params.source_language);
    form.append('target_language', params.target_language);
    form.append('style', params.style);
    const res = await fetch(`${API_BASE}/translate/image`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    });
    return handleResponse<TranslationResponse>(res);
  },

  async translateAudio(params: {
    file: File;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
  }): Promise<TranslationResponse> {
    const form = new FormData();
    form.append('file', params.file);
    form.append('source_language', params.source_language);
    form.append('target_language', params.target_language);
    form.append('style', params.style);
    const res = await fetch(`${API_BASE}/translate/audio`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    });
    return handleResponse<TranslationResponse>(res);
  },

  async startDocumentTranslation(params: {
    file: File;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
  }): Promise<{ job_id: string; status: string; progress: number }> {
    const form = new FormData();
    form.append('file', params.file);
    form.append('source_language', params.source_language);
    form.append('target_language', params.target_language);
    form.append('style', params.style);
    const res = await fetch(`${API_BASE}/translate/document`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    });
    return handleResponse(res);
  },

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<JobStatusResponse>(res);
  },

  async cancelJob(jobId: string): Promise<void> {
    await fetch(`${API_BASE}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
  },

  async translateVideo(params: {
    file: File;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
  }): Promise<TranslationResponse> {
    const form = new FormData();
    form.append('file', params.file);
    form.append('source_language', params.source_language);
    form.append('target_language', params.target_language);
    form.append('style', params.style);
    const res = await fetch(`${API_BASE}/translate/video`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: form,
    });
    return handleResponse<TranslationResponse>(res);
  },

  async translateWebsite(params: {
    url: string;
    source_language: string;
    target_language: string;
    style: TranslationStyle;
  }): Promise<TranslationResponse> {
    const res = await fetch(`${API_BASE}/translate/website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(params),
    });
    return handleResponse<TranslationResponse>(res);
  },

  async getHistory(params?: {
    input_type?: string;
    language?: string;
    search?: string;
  }): Promise<HistoryItem[]> {
    const qs = new URLSearchParams();
    if (params?.input_type) qs.set('input_type', params.input_type);
    if (params?.language) qs.set('language', params.language);
    if (params?.search) qs.set('search', params.search);
    const res = await fetch(`${API_BASE}/history?${qs.toString()}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse<HistoryItem[]>(res);
  },

  async toggleFavorite(id: string): Promise<{ id: string; is_favorite: boolean }> {
    const res = await fetch(`${API_BASE}/history/${id}/favorite`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
  },

  async deleteHistoryItem(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/history/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    await handleResponse(res);
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(`${API_BASE}/history`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    await handleResponse(res);
  },
};
