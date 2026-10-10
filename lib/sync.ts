import type { AppData, Feed, Item, Settings, TrashItem } from './types';

// Keeping the phone and the cloud the same. The rules are the server's (../chronkeep/lib/sync.js):
// every item and every single thing (settings, profile, note, calendars) has an `updatedAt`, the newer one wins,
// and a deletion for good travels as a tombstone. The phone notices its own changes by fingerprint, so the screens
// and the actions need to know nothing about sync.

export const PARTS = ['settings', 'profile', 'notepad', 'feeds', 'ignored'] as const;
type Part = (typeof PARTS)[number];
// Settings that mean the same on every device (notification switches are per device).
export const SHARED_SETTINGS = ['name', 'accent', 'theme', 'weekStart', 'showWeekends', 'dayStart', 'dayEnd', 'allDayHour', 'dueTime', 'reminderDefaults', 'nudgeDefaults', 'nagHours', 'digestHour', 'categories'] as const;

// ---- fingerprints ----
const stable = (v: unknown): string => (Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(v) ?? 'null');
// FNV-1a, twice with different seeds, as a short string (the phone's JavaScript has no built-in SHA).
export function hash(text: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x85ebca6b) + i | 0;
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
export const itemFp = (it: Item | TrashItem): string => { const { updatedAt, lastNag, ...rest } = it as Item & { lastNag?: number }; void updatedAt; void lastNag; return hash(stable(rest)); };

// ---- the note: the web keeps it as HTML, the phone as plain text ----
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split('\n').map((l) => `<div>${esc(l) || '<br>'}</div>`).join('');
}
export function htmlToText(html: string): string {
  if (!/^\s*</.test(html)) return html;
  let out = html
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '☑ ').replace(/<li[^>]*data-checked="false"[^>]*>/gi, '☐ ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li|h[1-6]|ul|ol)>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '');
  out = out.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

// What each part is, as sent to and read from the cloud.
export function partValue(d: AppData, name: Part): unknown {
  switch (name) {
    case 'settings': return Object.fromEntries(SHARED_SETTINGS.map((k) => [k, d.settings[k]]));
    case 'profile': return d.profile;
    case 'notepad': return { html: textToHtml(d.notepad.text), at: d.notepad.at };
    case 'feeds': return d.feeds;
    case 'ignored': return d.ignored;
  }
}
const partFp = (d: AppData, name: Part) => hash(stable(name === 'notepad' ? d.notepad.text : partValue(d, name)));

// ---- what the phone sends ----
export type Changes = {
  items: Item[];
  trash: TrashItem[];
  tombstones: Array<{ id: string; at: number }>;
  parts: Partial<Record<Part, { value: unknown; updatedAt: number }>>;
};
// Files that only exist on this phone have no bytes in the cloud, so the item goes without them.
const forCloud = <T extends Item>(it: T): T => ({ ...it, attachments: it.attachments.filter((a) => !a.local) });

export type Pending = { data: AppData; changes: Changes; empty: boolean; sent: { items: Record<string, string>; tombs: string[]; parts: Partial<Record<Part, string>> } };

// Works out what changed on the phone since the last sync, and stamps it. First time (nothing known yet) items keep
// their own times, and settings count as older than the cloud's, so signing in never overwrites what is already there.
export function pending(d: AppData, now: number): Pending {
  const s = d.sync, first = Object.keys(s.fp).length === 0 && s.cursor === 0;
  const sentItems: Record<string, string> = {}, items: Item[] = [], trash: TrashItem[] = [];
  const stampList = <T extends Item>(list: T[], out: T[]): T[] => list.map((it) => {
    const f = itemFp(it);
    if (s.fp[it.id] === f) return it;
    const next = s.fp[it.id] === undefined && first ? it : { ...it, updatedAt: now };
    sentItems[it.id] = itemFp(next);
    out.push(forCloud(next));
    return next;
  });
  const nextItems = stampList(d.items, items), nextTrash = stampList(d.trash, trash);
  const present = new Set([...d.items, ...d.trash].map((x) => x.id));
  const tombs = Object.keys(s.fp).filter((id) => !present.has(id));
  const partAt = { ...s.partAt }, parts: Changes['parts'] = {}, sentParts: Partial<Record<Part, string>> = {};
  for (const name of PARTS) {
    const f = partFp(d, name);
    if (s.partFp[name] === f) continue;
    const at = s.partFp[name] === undefined ? (first ? 0 : now) : now;
    partAt[name] = at; parts[name] = { value: partValue(d, name), updatedAt: at }; sentParts[name] = f;
  }
  const changes: Changes = { items, trash, tombstones: tombs.map((id) => ({ id, at: now })), parts };
  const empty = !items.length && !trash.length && !tombs.length && !Object.keys(parts).length;
  return { data: { ...d, items: nextItems, trash: nextTrash as TrashItem[], sync: { ...s, partAt } }, changes, empty, sent: { items: sentItems, tombs, parts: sentParts } };
}

// ---- what the cloud answers ----
export type Reply = {
  cursor: number;
  items: Item[];
  trash: TrashItem[];
  tombstones: Array<{ id: string; at: number }>;
  parts: Partial<Record<Part, { value: any; updatedAt: number }>>;
};

const sameSource = (a: Item, b: Item) => !!a.source && !!b.source && a.source.feed === b.source.feed && a.source.key === b.source.key;

// Takes in the cloud's answer: first notes what was sent as synced, then merges what is newer there.
export function receive(d: AppData, sent: Pending['sent'], reply: Reply): AppData {
  const fp = { ...d.sync.fp }, partFpMap = { ...d.sync.partFp }, partAt = { ...d.sync.partAt };
  for (const [id, f] of Object.entries(sent.items)) fp[id] = f;
  for (const id of sent.tombs) delete fp[id];
  for (const [name, f] of Object.entries(sent.parts)) partFpMap[name] = f as string;

  let items = [...d.items], trash = [...d.trash];
  const local = (id: string) => items.find((x) => x.id === id) ?? trash.find((x) => x.id === id);
  const take = (x: Item | TrashItem, intoTrash: boolean) => {
    const l = local(x.id);
    if (l && (l.updatedAt || 0) > (x.updatedAt || 0)) return;
    // changed here since it was last synced (even while the request was in flight): this phone's edit stands, and goes next time
    if (l && fp[l.id] !== undefined && itemFp(l) !== fp[l.id]) return;
    items = items.filter((i) => i.id !== x.id && !(x.source && !intoTrash && sameSource(i, x)));
    trash = trash.filter((i) => i.id !== x.id);
    const item = { ...x, attachments: [...(x.attachments || []), ...(l?.attachments || []).filter((a) => a.local)] } as Item;
    if (intoTrash) trash = [{ ...item, deletedAt: (x as TrashItem).deletedAt || Date.now() } as TrashItem, ...trash]; else items = [...items, item];
    fp[x.id] = itemFp(item);
  };
  for (const x of reply.items || []) take(x, false);
  for (const x of reply.trash || []) take(x, true);
  for (const t of reply.tombstones || []) {
    const l = local(t.id);
    if (l && (l.updatedAt || 0) > t.at) continue;
    items = items.filter((i) => i.id !== t.id); trash = trash.filter((i) => i.id !== t.id); delete fp[t.id];
  }

  let next: AppData = { ...d, items, trash: trash.slice(0, 200) };
  for (const name of PARTS) {
    const inc = (reply.parts || {})[name];
    if (!inc || inc.value === undefined) continue;
    if ((partAt[name] || 0) >= inc.updatedAt && partFpMap[name] !== undefined && partFpMap[name] !== partFp(next, name)) continue; // a newer change here, still to send
    if (name === 'settings') next = { ...next, settings: { ...next.settings, ...Object.fromEntries(SHARED_SETTINGS.filter((k) => k in inc.value).map((k) => [k, inc.value[k]])) } as Settings };
    else if (name === 'profile') next = { ...next, profile: { ...next.profile, ...inc.value } };
    else if (name === 'notepad') next = { ...next, notepad: { text: htmlToText(String(inc.value.html ?? '')), at: inc.value.at ?? null } };
    else if (name === 'feeds') next = { ...next, feeds: Array.isArray(inc.value) ? (inc.value as Feed[]) : next.feeds };
    else if (name === 'ignored') next = { ...next, ignored: Array.isArray(inc.value) ? inc.value : next.ignored };
    partFpMap[name] = partFp(next, name); partAt[name] = inc.updatedAt;
  }
  return { ...next, sync: { cursor: reply.cursor, fp, partFp: partFpMap, partAt } };
}
