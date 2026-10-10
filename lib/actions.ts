import { uuid } from './ids';
import { newItem } from './items';
import { human, typeLabel } from './dates';
import { isRepeat } from './recur';
import { normalize } from './store';
import type { AppData, Item, Planned, TrashItem } from './types';

// Every change to the data, as a function from the old data to the new. These are the web server's endpoints
// (items, bin, occurrences, snooze/done, import) without the network.

export type R<T = unknown> = { data: AppData } & T;

const touch = (it: Item, now: number): Item => ({ ...it, updatedAt: now });
const logAction = (d: AppData, title: string, body: string, itemId: string | null, now: number): AppData => ({ ...d, log: [...d.log, { id: `a|${now}|${uuid().slice(0, 6)}`, at: now, title, body, itemId, date: '', kind: 'action' as const }].slice(-300) });

export function addItem(d: AppData, patch: Partial<Item>, now = Date.now()): R<{ item: Item }> {
  const item = newItem({ ...patch, createdAt: now, updatedAt: now });
  return { data: { ...d, items: [...d.items, item] }, item };
}

export function updateItem(d: AppData, id: string, patch: Partial<Item>, now = Date.now()): R<{ item: Item | null }> {
  let item: Item | null = null;
  const items = d.items.map((it) => (it.id === id ? (item = touch({ ...it, ...patch, id, source: it.source, attachments: patch.attachments ?? it.attachments }, now)) : it));
  return { data: { ...d, items }, item };
}

// Deleting moves an item to the bin for 30 days. An item that came from a calendar is remembered so a sync does not bring it back.
export function removeItem(d: AppData, id: string, now = Date.now()): R<{ gone: TrashItem | null }> {
  const it = d.items.find((x) => x.id === id);
  if (!it) return { data: d, gone: null };
  const gone: TrashItem = { ...it, deletedAt: now, updatedAt: now };
  const ignored = it.source ? [...d.ignored.slice(-4999), `${it.source.feed}|${it.source.key}`] : d.ignored;
  return { data: { ...d, items: d.items.filter((x) => x.id !== id), trash: [gone, ...d.trash].slice(0, 200), ignored }, gone };
}

export function restoreItem(d: AppData, id: string, now = Date.now()): R<{ item: Item | null }> {
  const t = d.trash.find((x) => x.id === id);
  if (!t) return { data: d, item: null };
  const { deletedAt, ...rest } = t;
  const item = touch(rest as Item, now);
  const ignored = item.source ? d.ignored.filter((k) => k !== `${item.source!.feed}|${item.source!.key}`) : d.ignored;
  return { data: { ...d, trash: d.trash.filter((x) => x.id !== id), items: [...d.items, item], ignored }, item };
}

export const purgeItem = (d: AppData, id: string): AppData => ({ ...d, trash: d.trash.filter((x) => x.id !== id) });
export const emptyBin = (d: AppData): AppData => ({ ...d, trash: [] });
export const dropExpiredBin = (d: AppData, now = Date.now()): AppData => (d.trash.some((t) => now - t.deletedAt >= 30 * 86400000) ? { ...d, trash: d.trash.filter((t) => now - t.deletedAt < 30 * 86400000) } : d);

// Ticking: a one-off item is done or not; a repeating item is ticked per occurrence date.
export function toggleDone(d: AppData, id: string, ds: string, now = Date.now()): R<{ completing: boolean }> {
  const it = d.items.find((x) => x.id === id);
  if (!it) return { data: d, completing: false };
  const rep = isRepeat(it);
  const completing = rep ? !it.doneOn.includes(ds) : !it.done;
  const next: Item = rep
    ? { ...it, doneOn: completing ? [...it.doneOn, ds] : it.doneOn.filter((x) => x !== ds) }
    : { ...it, done: completing, doneAt: completing ? now : null };
  const snoozed = { ...d.snoozed }; delete snoozed[`${id}@${ds}`];
  return { data: { ...d, items: d.items.map((x) => (x.id === id ? touch(next, now) : x)), snoozed: completing ? snoozed : d.snoozed }, completing };
}

export function tickStep(d: AppData, id: string, stepId: string, now = Date.now()): R<{ allDone: boolean }> {
  let allDone = false;
  const items = d.items.map((it) => {
    if (it.id !== id) return it;
    const subtasks = it.subtasks.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
    allDone = subtasks.length > 0 && subtasks.every((s) => s.done) && !it.done;
    return touch({ ...it, subtasks }, now);
  });
  return { data: { ...d, items }, allDone };
}

// What the Snooze and Done buttons on a notification do.
export function applyAction(d: AppData, itemId: string, ds: string, action: 'done' | 'snooze', minutes = 10, now = Date.now()): R<{ ok: boolean; title?: string }> {
  const it = d.items.find((x) => x.id === itemId);
  if (!it) return { data: d, ok: false };
  const date = ds || it.date;
  if (action === 'done') {
    const r = toggleDone(d, itemId, date, now);
    // a notification's Done never un-ticks
    const data = r.completing ? r.data : d;
    return { data: logAction(data, `Done: ${it.title}`, 'Marked done from a notification', it.id, now), ok: true, title: it.title };
  }
  const m = Math.max(1, Math.min(1440, Number(minutes) || 10));
  const next = { ...d, snoozed: { ...d.snoozed, [`${itemId}@${date}`]: now + m * 60000 } };
  return { data: logAction(next, `Snoozed: ${it.title}`, `Reminders paused for ${human(m)}`, it.id, now), ok: true, title: it.title };
}

// "Only this one": take a single occurrence out of a repeating series. The series skips that day and a separate,
// non-repeating item takes its place, carrying whatever changes were made.
const ALLOWED = ['type', 'title', 'notes', 'location', 'date', 'time', 'endTime', 'endDate', 'category', 'reminders', 'nudges', 'priority', 'subtasks'] as const;
export function detachOccurrence(d: AppData, id: string, occ: string, patch: Partial<Item> = {}, now = Date.now()): R<{ original: Item | null; created: Item | null }> {
  const orig = d.items.find((x) => x.id === id);
  if (!orig || !isRepeat(orig) || !/^\d{4}-\d{2}-\d{2}$/.test(occ)) return { data: d, original: null, created: null };
  const picked: Partial<Item> = {};
  for (const k of ALLOWED) if (k in patch) (picked as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  const { source: _s, ...rest } = JSON.parse(JSON.stringify(orig)) as Item;
  const created: Item = { ...rest, id: uuid(), repeat: 'none', repeatUntil: '', skip: [], doneOn: [], done: orig.doneOn.includes(occ), doneAt: null, attachments: [], date: occ, ...picked, createdAt: now, updatedAt: now };
  const original = touch({ ...orig, skip: [...new Set([...(orig.skip ?? []), occ])], doneOn: orig.doneOn.filter((x) => x !== occ) }, now);
  return { data: { ...d, items: [...d.items.map((x) => (x.id === id ? original : x)), created] }, original, created };
}

export function skipOccurrence(d: AppData, id: string, occ: string, now = Date.now()): AppData {
  return { ...d, items: d.items.map((it) => (it.id === id ? touch({ ...it, skip: [...new Set([...(it.skip ?? []), occ])] }, now) : it)) };
}

export function setNotepad(d: AppData, text: string, now = Date.now()): AppData {
  return { ...d, notepad: { text, at: new Date(now).toISOString() } };
}

// Bringing in the web app's "Export my data" file: items that are not here yet are added; what is already here is kept.
export function importWebExport(d: AppData, raw: unknown): R<{ added: number }> {
  const incoming = normalize(raw);
  const have = new Set([...d.items.map((i) => i.id), ...d.trash.map((i) => i.id)]);
  const fresh = incoming.items.filter((i) => !have.has(i.id));
  const known = new Set(d.settings.categories.map((c) => c.name));
  const cats = [...d.settings.categories, ...incoming.settings.categories.filter((c) => !known.has(c.name) && fresh.some((i) => i.category === c.name))];
  const profile = { ...incoming.profile, ...Object.fromEntries(Object.entries(d.profile).filter(([, v]) => v)) } as AppData['profile'];
  return { data: { ...d, items: [...d.items, ...fresh], settings: { ...d.settings, categories: cats }, profile }, added: fresh.length };
}

export const typeName = typeLabel;
export type { Planned };
