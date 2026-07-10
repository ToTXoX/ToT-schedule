import { invoke } from '@tauri-apps/api/core';
import type { PlannerState } from './types';

const LEGACY_KEYS = {
  categories: 'planner_categories',
  tasks: 'planner_tasks',
  notes: 'planner_notes',
  moods: 'planner_moods',
  userName: 'planner_user_name',
  userAvatar: 'planner_user_avatar',
} as const;

const isTauri = () => '__TAURI_INTERNALS__' in window;

const readJson = <T>(key: string): T | undefined => {
  const value = localStorage.getItem(key);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const readLegacyState = (fallback: PlannerState): PlannerState | null => {
  const hasLegacyData = Object.values(LEGACY_KEYS).some(key => localStorage.getItem(key) !== null);
  if (!hasLegacyData) return null;

  return {
    schemaVersion: 1,
    categories: readJson(LEGACY_KEYS.categories) ?? fallback.categories,
    tasks: readJson(LEGACY_KEYS.tasks) ?? fallback.tasks,
    notes: readJson(LEGACY_KEYS.notes) ?? fallback.notes,
    moods: readJson(LEGACY_KEYS.moods) ?? fallback.moods,
    userName: localStorage.getItem(LEGACY_KEYS.userName) || fallback.userName,
    userAvatar: localStorage.getItem(LEGACY_KEYS.userAvatar) || fallback.userAvatar,
  };
};

const writeBrowserFallback = (state: PlannerState) => {
  localStorage.setItem(LEGACY_KEYS.categories, JSON.stringify(state.categories));
  localStorage.setItem(LEGACY_KEYS.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(LEGACY_KEYS.notes, JSON.stringify(state.notes));
  localStorage.setItem(LEGACY_KEYS.moods, JSON.stringify(state.moods));
  localStorage.setItem(LEGACY_KEYS.userName, state.userName);
  localStorage.setItem(LEGACY_KEYS.userAvatar, state.userAvatar);
};

export async function loadPlannerState(fallback: PlannerState): Promise<PlannerState> {
  const legacyState = readLegacyState(fallback);

  if (!isTauri()) {
    return legacyState ?? fallback;
  }

  const savedState = await invoke<PlannerState | null>('load_state');
  if (savedState) return savedState;

  const initialState = legacyState ?? fallback;
  await invoke('save_state', { state: initialState });
  return initialState;
}

export async function savePlannerState(state: PlannerState): Promise<void> {
  if (isTauri()) {
    await invoke('save_state', { state });
    return;
  }

  writeBrowserFallback(state);
}
