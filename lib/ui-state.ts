import { useSyncExternalStore } from 'react';
import { ymd } from './recur';
import type { Item } from './types';

// What the screens share while you use the app: the calendar's date and view, the filter, the item sheet.
export type View = 'month' | '3days' | 'day';
export type TypeFilter = 'all' | 'assignment' | 'event' | 'todo';
export type SheetState = { item: Item | null; preset?: Partial<Item>; occ?: string } | null;
export type UI = { cur: string; view: View; typeF: TypeFilter; sheet: SheetState; noteOpen: boolean; navDir: number };

let ui: UI = { cur: ymd(new Date()), view: '3days', typeF: 'all', sheet: null, noteOpen: false, navDir: 0 };
const listeners = new Set<() => void>();

export const getUI = () => ui;
export function setUI(patch: Partial<UI>): void {
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}
export const useUI = <T,>(select: (u: UI) => T): T => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => select(ui));

// Open the item sheet for an item (editing, from the occurrence on `occ`) or a new one.
export const openItem = (item: Item | null, preset?: Partial<Item>, occ?: string) => setUI({ sheet: { item, preset, occ } });
export const closeItem = () => setUI({ sheet: null });
