import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InputMode, TranslationStyle } from '../types/translation';

interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  token?: string | null;
}

interface AppState {
  appName: string;
  theme: 'light' | 'dark';
  activeMode: InputMode;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage: string | null;
  style: TranslationStyle;
  recentLanguages: string[];
  favoriteLanguages: string[];
  historyEnabled: boolean;
  user: UserProfile | null;
  pendingFile: File | null;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setActiveMode: (mode: InputMode) => void;
  setSourceLanguage: (code: string) => void;
  setTargetLanguage: (code: string) => void;
  setDetectedLanguage: (code: string | null) => void;
  swapLanguages: () => void;
  setStyle: (style: TranslationStyle) => void;
  toggleFavoriteLanguage: (code: string) => void;
  setHistoryEnabled: (enabled: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setPendingFile: (file: File | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      appName: import.meta.env.VITE_APP_NAME || 'Mozhi AI',
      theme: 'light',
      activeMode: 'text',
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      detectedLanguage: null,
      style: 'Natural',
      recentLanguages: ['ta', 'en', 'hi'],
      favoriteLanguages: ['ta', 'en'],
      historyEnabled: true,
      user: null,
      pendingFile: null,

      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
      setActiveMode: (activeMode) => set({ activeMode }),
      setSourceLanguage: (code) =>
        set((state) => ({
          sourceLanguage: code,
          detectedLanguage: code === 'auto' ? state.detectedLanguage : null,
          recentLanguages:
            code !== 'auto'
              ? [code, ...state.recentLanguages.filter((c) => c !== code)].slice(0, 5)
              : state.recentLanguages,
        })),
      setTargetLanguage: (code) =>
        set((state) => ({
          targetLanguage: code,
          recentLanguages: [code, ...state.recentLanguages.filter((c) => c !== code)].slice(0, 5),
        })),
      setDetectedLanguage: (detectedLanguage) => set({ detectedLanguage }),
      swapLanguages: () => {
        const { sourceLanguage, targetLanguage, detectedLanguage } = get();
        const effectiveSource = sourceLanguage === 'auto' ? detectedLanguage : sourceLanguage;
        if (!effectiveSource || effectiveSource === targetLanguage) return;
        set({
          sourceLanguage: targetLanguage,
          targetLanguage: effectiveSource,
          detectedLanguage: null,
        });
      },
      setStyle: (style) => set({ style }),
      toggleFavoriteLanguage: (code) =>
        set((state) => ({
          favoriteLanguages: state.favoriteLanguages.includes(code)
            ? state.favoriteLanguages.filter((c) => c !== code)
            : [...state.favoriteLanguages, code],
        })),
      setHistoryEnabled: (historyEnabled) => set({ historyEnabled }),
      setUser: (user) => set({ user }),
      setPendingFile: (pendingFile) => set({ pendingFile }),
    }),
    {
      name: 'lingua-ai-storage',
      partialize: (state) => ({
        theme: state.theme,
        sourceLanguage: state.sourceLanguage,
        targetLanguage: state.targetLanguage,
        style: state.style,
        recentLanguages: state.recentLanguages,
        favoriteLanguages: state.favoriteLanguages,
        historyEnabled: state.historyEnabled,
      }),
    }
  )
);
