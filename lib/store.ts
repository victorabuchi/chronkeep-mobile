import { defaultSettings } from './defaults';
import { newItem } from './items';
import type { AppData, Feed, Item, Planned, Profile, TrashItem } from './types';

// Keeping the data on the phone: one JSON file, saved safely, with daily backups. The web server's lib/store.js,
// for a phone: the file system comes in as a small interface so the logic is tested without a device.

export interface FS {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  list(dir: string): Promise<string[]>;
  mkdir(dir: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const dayStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DATED = /^data-\d{4}-\d{2}-\d{2}\.json$/;

export const emptyData = (): AppData => ({
  settings: defaultSettings(),
  profile: { name: '', email: '', phone: '', photo: '' },
  items: [], trash: [], feeds: [], ignored: [], snoozed: {}, notepad: { text: '', at: null }, log: [],
  sync: { cursor: 0, fp: {}, partFp: {}, partAt: {} },
});

// Turns whatever was saved (or imported from the web app's export) into the current shape.
export function normalize(raw: unknown): AppData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const d = emptyData();
  const settings = { ...d.settings, ...(r.settings || {}) };
  settings.reminderDefaults = { ...d.settings.reminderDefaults, ...(r.settings?.reminderDefaults || {}) };
  settings.nudgeDefaults = { ...d.settings.nudgeDefaults, ...(r.settings?.nudgeDefaults || {}) };
  if (!Array.isArray(settings.categories)) settings.categories = d.settings.categories;
  // The web app's settings carry server-only keys; keep just ours.
  const keep: Record<string, unknown> = {};
  for (const k of Object.keys(d.settings)) keep[k] = (settings as Record<string, unknown>)[k];
  const fix = (it: any): Item => {
    const base = newItem({ createdAt: Number(it?.createdAt) || 0, updatedAt: Number(it?.updatedAt) || 0 });
    const out = { ...base, ...it } as Item;
    // Older items had a single `remind`.
    out.reminders = Array.isArray(it?.reminders) ? it.reminders : it?.remind != null && it.remind !== '' ? [Number(it.remind)] : [];
    for (const k of ['subtasks', 'attachments', 'doneOn', 'nudges'] as const) if (!Array.isArray(out[k])) (out as any)[k] = [];
    return out;
  };
  return {
    settings: keep as AppData['settings'],
    profile: { ...d.profile, ...(r.profile || {}) } as Profile,
    items: Array.isArray(r.items) ? r.items.map(fix) : [],
    trash: Array.isArray(r.trash) ? r.trash.map((t: any) => ({ ...fix(t), deletedAt: Number(t.deletedAt) || Date.now() }) as TrashItem) : [],
    feeds: Array.isArray(r.feeds) ? (r.feeds as Feed[]) : [],
    ignored: Array.isArray(r.ignored) ? r.ignored : [],
    snoozed: r.snoozed && typeof r.snoozed === 'object' ? r.snoozed : {},
    notepad: r.notepad && typeof r.notepad.text === 'string' ? { text: r.notepad.text, at: r.notepad.at ?? null } : { text: '', at: null },
    log: Array.isArray(r.log) ? (r.log as Planned[]) : [],
    sync: { ...d.sync, ...(r.sync && typeof r.sync === 'object' ? r.sync : {}) },
  };
}

export type Loaded = { data: AppData; recoveredFrom?: string; keptAs?: string };

export function createStore(fs: FS, root: string) {
  const file = `${root}data.json`, tmp = `${root}data.json.tmp`, backups = `${root}backups/`;
  const parse = (t: string | null): unknown | null => { if (t === null) return null; try { return JSON.parse(t); } catch { return null; } };

  async function listBackups(): Promise<Array<{ name: string; at: number }>> {
    if (!(await fs.exists(backups))) return [];
    const names = (await fs.list(backups)).filter((n) => /^data-.*\.json$/.test(n));
    // newest first: dated ones sort by date, labelled ones by the time they carry
    return names.map((name) => ({ name, at: Number((name.match(/-(\d{13})\.json$/) || [])[1]) || Date.parse((name.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || '') || 0 })).sort((a, b) => b.at - a.at || b.name.localeCompare(a.name));
  }

  async function prune(keepDays = 14, keepLabelled = 20) {
    const all = await listBackups(), dated = all.filter((b) => DATED.test(b.name)), other = all.filter((b) => !DATED.test(b.name));
    for (const b of [...dated.slice(keepDays), ...other.slice(keepLabelled)]) await fs.remove(`${backups}${b.name}`);
  }

  // A copy of the data file under a label ("pre-delete", "manual-...") kept for later.
  async function backupNow(label: string): Promise<string | null> {
    if (!(await fs.exists(file))) return null;
    await fs.mkdir(backups);
    const name = `data-${label}.json`;
    if (await fs.exists(`${backups}${name}`)) await fs.remove(`${backups}${name}`);
    await fs.copy(file, `${backups}${name}`);
    await prune();
    return name;
  }

  // One backup per day, the first time the app opens that day.
  async function dailyBackup(): Promise<string | null> {
    const name = `data-${dayStamp()}.json`;
    if (await fs.exists(`${backups}${name}`)) return null;
    return backupNow(dayStamp());
  }

  // Writes to a temp file first, so being closed mid-save cannot leave half a file.
  async function save(data: AppData): Promise<void> {
    await fs.mkdir(root);
    await fs.write(tmp, JSON.stringify(data));
    if (await fs.exists(file)) await fs.remove(file);
    await fs.move(tmp, file);
  }

  // Reads the data. A damaged file is kept aside (never overwritten) and the newest good backup is used.
  async function load(): Promise<Loaded> {
    await fs.mkdir(root);
    const main = parse(await fs.read(file).catch(() => null));
    if (main) return { data: normalize(main) };
    const half = parse(await fs.read(tmp).catch(() => null)); // closed between deleting the old file and moving the new one
    if (half && !(await fs.exists(file))) return { data: normalize(half), recoveredFrom: 'data.json.tmp' };
    if (await fs.exists(file)) {
      const aside = `${root}data.corrupt-${Date.now()}.json`;
      await fs.move(file, aside);
      for (const b of await listBackups()) {
        const t = parse(await fs.read(`${backups}${b.name}`).catch(() => null));
        if (t) return { data: normalize(t), recoveredFrom: b.name, keptAs: aside };
      }
      return { data: emptyData(), keptAs: aside };
    }
    return { data: emptyData() };
  }

  async function readBackup(name: string): Promise<AppData | null> {
    if (!/^data-[\w.-]+\.json$/.test(name)) return null;
    const t = parse(await fs.read(`${backups}${name}`).catch(() => null));
    return t ? normalize(t) : null;
  }

  return { save, load, backupNow, dailyBackup, listBackups, readBackup, root };
}
