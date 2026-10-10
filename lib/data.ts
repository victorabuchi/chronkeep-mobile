import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { phoneFs, ROOT } from './fs';
import { dropExpiredBin } from './actions';
import { syncNotifications } from './notify';
import { seed } from './seed';
import { createStore, emptyData } from './store';
import type { AppData } from './types';

// The app's data, kept in memory and saved to the phone after every change. Screens read it with useData();
// changes go through mutate(), which also re-plans the reminders.

const store = createStore(phoneFs, ROOT);
let state: AppData = emptyData();
let ready = false;
let loadNote = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let planTimer: ReturnType<typeof setTimeout> | null = null;
let writing: Promise<void> = Promise.resolve();

const persistNow = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  const snapshot = state;
  writing = writing.then(() => store.save(snapshot)).catch(() => undefined);
  return writing;
};

async function replan() {
  planTimer = null;
  const log = await syncNotifications(state);
  if (log !== state.log) { state = { ...state, log }; emit(); persistSoon(); }
}
const replanSoon = (ms = 800) => { if (planTimer) clearTimeout(planTimer); planTimer = setTimeout(() => void replan(), ms); };
const persistSoon = () => { if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(() => void persistNow(), 300); };

export const getData = () => state;
// For things that react to every change (sync): returns a function that stops listening.
export const onChange = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const isReady = () => ready;
export const loadMessage = () => loadNote;

// Make a change. Returns whatever the change function returns alongside the new data.
export function mutate(change: (d: AppData) => AppData): void {
  state = change(state);
  emit();
  persistSoon();
  replanSoon();
}

export function replaceAll(next: AppData): void {
  state = next;
  emit();
  void persistNow();
  replanSoon(200);
}

export async function initData(): Promise<void> {
  if (ready) return;
  const loaded = await store.load();
  if (loaded.keptAs) loadNote = `Your data file was damaged. It was kept aside${loaded.recoveredFrom ? ` and ${loaded.recoveredFrom} was loaded instead` : ', and ChronKeep started empty'}.`;
  state = dropExpiredBin(loaded.data);
  if (process.env.EXPO_PUBLIC_SEED === '1' && !state.items.length) state = seed(state);
  await store.dailyBackup().catch(() => undefined);
  ready = true;
  emit();
  await persistNow();
  replanSoon(300);
}

// Closed or sent to the background: save at once, and re-plan so nothing is stale.
AppState.addEventListener('change', (s) => { if (s !== 'active' && ready) void persistNow(); else if (s === 'active' && ready) replanSoon(500); });

export const backups = {
  list: () => store.listBackups(),
  now: (label: string) => store.backupNow(label),
  read: (name: string) => store.readBackup(name),
};

export function useData<T>(select: (d: AppData) => T): T {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => select(state));
}
export const useReady = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => ready);
