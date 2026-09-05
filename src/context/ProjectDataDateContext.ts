import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ProjectDataDateState {
  dataDate: string;
  projectId: string;
}

export interface ProjectDataDateContextValue extends ProjectDataDateState {
  setDataDate: (date: string) => boolean;
  setProjectId: (id: string) => void;
  resetDataDate: () => void;
}

/**
 * Validates ISO date format YYYY-MM-DD and real Gregorian calendar validity.
 */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parts = trimmed.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(`${trimmed}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === trimmed;
}

const STORAGE_KEY = 'buildtrack:unified-project-data-date:v1';

export function localTodayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStoredState(): Partial<ProjectDataDateState> {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return {};
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Partial<ProjectDataDateState>;
    return {
      dataDate: isValidIsoDate(parsed.dataDate) ? parsed.dataDate : undefined,
      projectId: typeof parsed.projectId === 'string' && parsed.projectId.trim() ? parsed.projectId : undefined,
    };
  } catch {
    return {};
  }
}

function persistState(state: ProjectDataDateState): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // Session storage is optional in restricted desktop/webview environments.
  }
}

export function getInitialDataDate(): string {
  return readStoredState().dataDate || localTodayIso();
}

/**
 * Pure state store for headless logic & unit tests outside React DOM.
 */
export function createProjectDataDateStore(initial?: Partial<ProjectDataDateState>) {
  let currentDataDate = (initial?.dataDate && isValidIsoDate(initial.dataDate))
    ? initial.dataDate
    : localTodayIso();
  let currentProjectId = initial?.projectId || 'all';

  const listeners = new Set<() => void>();

  return {
    getState(): ProjectDataDateState {
      return { dataDate: currentDataDate, projectId: currentProjectId };
    },
    setDataDate(date: string): boolean {
      if (!isValidIsoDate(date)) {
        return false;
      }
      currentDataDate = date.trim();
      listeners.forEach((listener) => listener());
      return true;
    },
    setProjectId(id: string): void {
      currentProjectId = id || 'all';
      listeners.forEach((listener) => listener());
    },
    resetDataDate(): void {
      currentDataDate = localTodayIso();
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const ProjectDataDateContext = createContext<ProjectDataDateContextValue | null>(null);

export interface ProjectDataDateProviderProps {
  children: React.ReactNode;
  initialDate?: string;
  initialProjectId?: string;
}

export function ProjectDataDateProvider(props: ProjectDataDateProviderProps): React.ReactElement {
  const { children, initialDate, initialProjectId = 'all' } = props;
  const [state, setState] = useState<ProjectDataDateState>(() => {
    const stored = readStoredState();
    return {
      dataDate: initialDate && isValidIsoDate(initialDate) ? initialDate : stored.dataDate || localTodayIso(),
      projectId: initialProjectId !== 'all' ? initialProjectId : stored.projectId || 'all',
    };
  });

  const setDataDate = useCallback((newDate: string): boolean => {
    if (!isValidIsoDate(newDate)) {
      return false;
    }
    const cleanDate = newDate.trim();
    setState((current) => {
      const next = { ...current, dataDate: cleanDate };
      persistState(next);
      return next;
    });
    return true;
  }, []);

  const setProjectId = useCallback((newProjectId: string) => {
    setState((current) => {
      const next = { ...current, projectId: newProjectId.trim() || 'all' };
      persistState(next);
      return next;
    });
  }, []);

  const resetDataDate = useCallback(() => {
    setState((current) => {
      const next = { ...current, dataDate: localTodayIso() };
      persistState(next);
      return next;
    });
  }, []);

  const value = useMemo<ProjectDataDateContextValue>(() => ({
    ...state,
    setDataDate,
    setProjectId,
    resetDataDate,
  }), [state, setDataDate, setProjectId, resetDataDate]);

  return React.createElement(ProjectDataDateContext.Provider, { value }, children);
}

export function useProjectDataDate(): ProjectDataDateContextValue {
  const context = useContext(ProjectDataDateContext);
  if (!context) {
    throw new Error('useProjectDataDate must be used within a ProjectDataDateProvider');
  }
  return context;
}
