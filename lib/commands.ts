import * as A from './actions';
import * as sync from './calsync';
import { getData, mutate, replaceAll } from './data';
import { uuid } from './ids';
import { build } from './ics';
import { emptyData, normalize } from './store';
import { today } from './dates';
import type { AppData, Feed, Item } from './types';

// What the screens call. Each runs one of the pure changes in actions.ts on the live data and returns what the
// screen needs for its toast.

function run<T>(fn: (d: AppData) => A.R<T>): T {
  let out!: T;
  mutate((d) => { const r = fn(d); const { data, ...rest } = r; out = rest as T; return data; });
  return out;
}

export const addItem = (patch: Partial<Item>) => run((d) => A.addItem(d, patch)).item;
export const updateItem = (id: string, patch: Partial<Item>) => run((d) => A.updateItem(d, id, patch)).item;
export const removeItem = (id: string) => run((d) => A.removeItem(d, id)).gone;
export const restoreItem = (id: string) => run((d) => A.restoreItem(d, id)).item;
export const purgeItem = (id: string) => mutate((d) => A.purgeItem(d, id));
export const emptyBin = () => mutate((d) => A.emptyBin(d));
export const toggleDone = (id: string, ds: string) => run((d) => A.toggleDone(d, id, ds)).completing;
export const tickStep = (id: string, stepId: string) => run((d) => A.tickStep(d, id, stepId)).allDone;
export const detachOccurrence = (id: string, occ: string, patch: Partial<Item>) => run((d) => A.detachOccurrence(d, id, occ, patch));
export const skipOccurrence = (id: string, occ: string) => mutate((d) => A.skipOccurrence(d, id, occ));
export const respondTo = (itemId: string, date: string, action: 'done' | 'snooze') => run((d) => A.applyAction(d, itemId, date, action));
export const saveNote = (text: string) => mutate((d) => A.setNotepad(d, text));
export const setSettings = (patch: Partial<AppData['settings']>) => mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
export const setProfile = (patch: Partial<AppData['profile']>) => mutate((d) => ({ ...d, profile: { ...d.profile, ...patch } }));

// ---- calendar links and files ----

const ensureCategory = (d: AppData, name: string): AppData => (name && !d.settings.categories.some((c) => c.name === name) ? { ...d, settings: { ...d.settings, categories: [...d.settings.categories, { name, color: '#0e8fb0' }] } } : d);

function applyText(feed: { id: string; category: string }, text: string, d: AppData) {
  const db = { items: [...d.items], ignored: d.ignored };
  const result = sync.importText(db, feed, text, { today: today(), reminders: d.settings.reminderDefaults.event });
  return { db, result };
}

// Follows a calendar link: downloads it, brings its events in, and keeps the link for later syncs.
export async function addFeed(name: string, url: string, category: string): Promise<sync.Result> {
  if (!name.trim()) throw new Error('Give the calendar a name.');
  const text = await sync.fetchCalendar(url.trim());
  const feed: Feed = { id: uuid(), name: name.trim().slice(0, 60), url: url.trim(), category: category.trim().slice(0, 40), enabled: true, lastSync: Date.now(), lastError: '', count: 0 };
  let result!: sync.Result;
  mutate((d) => {
    const r = applyText(feed, text, d);
    result = r.result;
    feed.count = r.db.items.filter((i) => i.source?.feed === feed.id).length;
    return ensureCategory({ ...d, items: r.db.items, feeds: [...d.feeds, feed] }, feed.category);
  });
  return result;
}

export async function syncFeed(id: string): Promise<sync.Result> {
  const feed = getData().feeds.find((f) => f.id === id);
  if (!feed) throw new Error('That calendar is gone.');
  try {
    const text = await sync.fetchCalendar(feed.url);
    let result!: sync.Result;
    mutate((d) => {
      const r = applyText(feed, text, d);
      result = r.result;
      const count = r.db.items.filter((i) => i.source?.feed === id).length;
      return { ...d, items: r.db.items, feeds: d.feeds.map((f) => (f.id === id ? { ...f, lastSync: Date.now(), lastError: '', count } : f)) };
    });
    return result;
  } catch (e) {
    const message = (e as Error).message;
    mutate((d) => ({ ...d, feeds: d.feeds.map((f) => (f.id === id ? { ...f, lastSync: Date.now(), lastError: message } : f)) }));
    throw e;
  }
}

// Calendars not synced for six hours are brought up to date (called when the app opens or comes back).
export async function syncDueFeeds(): Promise<void> {
  for (const f of getData().feeds) if (f.enabled && Date.now() - f.lastSync > 6 * 3600000) await syncFeed(f.id).catch(() => undefined);
}

export function removeFeed(id: string, removeEvents: boolean) {
  mutate((d) => ({
    ...d,
    items: removeEvents ? d.items.filter((i) => i.source?.feed !== id) : d.items.map(({ source, ...rest }) => (source?.feed === id ? (rest as Item) : ({ ...rest, source } as Item))),
    feeds: d.feeds.filter((f) => f.id !== id),
    ignored: d.ignored.filter((k) => !k.startsWith(id + '|')),
  }));
}

export function renameFeedCategory(id: string, category: string) {
  mutate((d) => ensureCategory({ ...d, feeds: d.feeds.map((f) => (f.id === id ? { ...f, category } : f)), items: d.items.map((i) => (i.source?.feed === id ? { ...i, category } : i)) }, category));
}

// A calendar file (.ics) chosen on the phone.
export function importIcs(name: string, text: string, category: string): sync.Result {
  let result!: sync.Result;
  mutate((d) => {
    const r = applyText({ id: 'file:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), category }, text, d);
    result = r.result;
    return ensureCategory({ ...d, items: r.db.items }, category);
  });
  return result;
}

// ---- your data ----

// Everything, like the web's "Export my data" (calendar links are left out: they hold private tokens).
export const exportJson = (): string => {
  const d = getData();
  return JSON.stringify({ exportedAt: new Date().toISOString(), profile: d.profile, settings: d.settings, items: d.items, bin: d.trash, notepad: d.notepad, calendars: d.feeds.map(({ url, ...f }) => f) }, null, 2);
};
export const exportIcs = (): string => build(getData().items.filter((i) => !i.source), { name: getData().settings.name });

// A file from the web app's "Export my data": items not here yet are added.
export function importExport(text: string): number {
  let added = 0;
  mutate((d) => { const r = A.importWebExport(d, JSON.parse(text)); added = r.added; return r.data; });
  return added;
}

export function restoreFrom(data: AppData) { replaceAll(normalize(data)); }
export function deleteEverything() { replaceAll(emptyData()); }
