import { AppState } from 'react-native';
import { emptyData } from './store';
import { getData, mutate, onChange, replaceAll } from './data';
import { api, ApiError } from './http';
import { getToken, setToken, useToken } from './session';
import { pending, receive, type Reply } from './sync';
import { useSyncExternalStore } from 'react';

// Sending this phone's changes to the cloud and bringing the cloud's back. The rules are in sync.ts.

export type SyncStatus = { running: boolean; lastOk: number; error: string };
let status: SyncStatus = { running: false, lastOk: 0, error: '' };
const listeners = new Set<() => void>();
const setStatus = (patch: Partial<SyncStatus>) => { status = { ...status, ...patch }; listeners.forEach((l) => l()); };
export const useSyncStatus = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => status);

let running: Promise<boolean> | null = null, again = false;

// One round with the cloud. Returns false when it could not (offline, signed out); the data is never touched then.
export function syncNow(): Promise<boolean> {
  if (!getToken()) return Promise.resolve(false);
  if (running) { again = true; return running; }
  running = (async () => {
    setStatus({ running: true });
    try {
      const before = getData(), p = pending(before, Date.now());
      if (p.data !== before) mutate(() => p.data);
      const reply = await api<Reply>('/api/sync', { method: 'POST', body: { cursor: before.sync.cursor, changes: p.changes }, timeout: 60000 });
      mutate((d) => receive(d, p.sent, reply));
      setStatus({ lastOk: Date.now(), error: '' });
      return true;
    } catch (e) {
      setStatus({ error: e instanceof ApiError ? e.message : 'Sync did not finish.' });
      return false;
    } finally {
      running = null; setStatus({ running: false });
      if (again) { again = false; schedule(1500); }
    }
  })();
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule(ms = 3000) { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; void syncNow(); }, ms); }
const dirty = () => !pending(getData(), Date.now()).empty;

// Keeps the phone in step while the app is open: after you change something, when the app comes back to the front,
// and every minute (to pick up what you did on the web).
export function startSync(): () => void {
  const off = onChange(() => { if (getToken() && dirty()) schedule(); });
  const app = AppState.addEventListener('change', (s) => { if (s === 'active') void syncNow(); });
  const every = setInterval(() => { if (AppState.currentState === 'active') void syncNow(); }, 60000);
  void syncNow();
  return () => { off(); app.remove(); clearInterval(every); if (timer) clearTimeout(timer); };
}

// Signing out takes this person's data off the phone, so the next person to sign in starts clean (it is all in the cloud).
export async function signOutAndWipe(): Promise<void> {
  if (getToken()) await syncNow().catch(() => false);
  await setToken(null);
  replaceAll(emptyData());
}
export async function deleteCloudAccount(confirm: string): Promise<void> {
  await api('/api/account', { method: 'DELETE', body: { confirm } });
  await setToken(null);
  replaceAll(emptyData());
}
export { useToken };
