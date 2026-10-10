import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

// The signed-in person's token, kept in the phone's secure storage (the keychain on iOS, the keystore on Android).
const KEY = 'chronkeep.session';
let token: string | null = null;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadSession(): Promise<void> {
  try { token = (await SecureStore.getItemAsync(KEY)) || null; } catch { token = null; }
  ready = true;
  emit();
}
export async function setToken(next: string | null): Promise<void> {
  token = next; emit();
  try { if (next) await SecureStore.setItemAsync(KEY, next); else await SecureStore.deleteItemAsync(KEY); } catch { /* the token stays in memory for this run */ }
}
export const getToken = () => token;
const sub = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
export const useToken = () => useSyncExternalStore(sub, () => token);
export const useSessionReady = () => useSyncExternalStore(sub, () => ready);
