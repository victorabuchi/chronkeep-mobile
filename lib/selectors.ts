import { DOW, DOWL, MON, hm, pad } from './dates';
import { activeRule } from './schedule';
import { addDays, day, endOf, isRepeat, occursOn, startFor, ymd } from './recur';
import type { Item, Settings } from './types';

// What the screens show, worked out from the items. Ported from the web app's tasks and history code
// (public/js/030-tasks.js, 130-history.js) so both apps group and count the same way.

export const PRIO = { high: ['High', 'neg'], medium: ['Medium', 'warn'], low: ['Low', '#2b7bd6'] } as const;

export const colorOf = (s: Settings, category: string, fallback: string) => s.categories.find((c) => c.name === category)?.color ?? fallback;

export const isDone = (it: Item, ds: string) => (isRepeat(it) ? (it.doneOn || []).includes(ds) : it.done);

// The moment an occurrence is due: its time, or the usual due time (events with no time count from midnight).
export function dueAt(it: Item, ds: string, s: Settings): number {
  const [h = 0, m = 0] = (it.time || (it.type === 'event' ? '00:00' : s.dueTime || '23:59')).split(':').map(Number);
  const x = day(ds);
  x.setHours(h, m, 0, 0);
  return x.getTime();
}

// Events that run over midnight or several days also show on the days after they start.
export const showsOn = (it: Item, ds: string) => (it.type === 'event' ? startFor(it, ds) !== null : occursOn(it, ds));

export const matchesFilter = (it: Item, f: 'all' | 'assignment' | 'event' | 'todo') => f === 'all' || it.type === f;

// The date a task is next due: its date, or for a repeating one the next occurrence not yet ticked.
export function nextOcc(it: Item, from = new Date()): string | null {
  if (!isRepeat(it)) return it.date || null;
  for (let i = 0; i < 400; i++) {
    const ds = ymd(addDays(new Date(from.getFullYear(), from.getMonth(), from.getDate()), i));
    if (occursOn(it, ds) && !isDone(it, ds)) return ds;
  }
  return null;
}

// "in 3 days" / "1 day overdue", with a tone for its colour.
export function rel(due: number, now: number): [string, 'late' | 'soon' | 'ok'] {
  const ms = due - now, a = Math.abs(ms), min = Math.round(a / 60000), h = Math.round(a / 3600000), dd = Math.round(a / 86400000);
  const t = min < 60 ? `${min} min` : h < 24 ? `${h} h` : `${dd} day${dd === 1 ? '' : 's'}`;
  return ms < 0 ? [`${t} overdue`, 'late'] : [`in ${t}`, h < 24 ? 'soon' : 'ok'];
}

export const EVERY: Array<[number, string]> = [[5, '5 min'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [360, '6 hours'], [720, '12 hours']];
export const everyLabel = (m: number) => (EVERY.find(([v]) => v === +m) ?? [0, `${m} min`])[1];
export const nudgeNow = (it: Item, ds: string, s: Settings, now: number) => activeRule(it, dueAt(it, ds, s), now);

export type TaskEntry = { it: Item; ds: string | null };
export type TaskGroups = { groups: Array<[string, TaskEntry[]]>; done: TaskEntry[]; open: number; overdue: number; urgent: number };

export function taskGroups(items: Item[], typeF: 'all' | 'assignment' | 'event' | 'todo', s: Settings, now = Date.now()): TaskGroups {
  const n = new Date(now), today = day(ymd(n)), open: TaskEntry[] = [], done: TaskEntry[] = [];
  for (const it of items) {
    if (it.type === 'event' || typeF === 'event' || !matchesFilter(it, typeF)) continue;
    const ds = nextOcc(it, n);
    if (!isRepeat(it) && it.done) done.push({ it, ds }); else open.push({ it, ds });
  }
  const key = (o: TaskEntry) => (o.ds ? dueAt(o.it, o.ds, s) : Infinity), prank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const pr = (o: TaskEntry) => prank[o.it.priority] ?? 3;
  open.sort((a, b) => (key(a) === key(b) ? 0 : key(a) < key(b) ? -1 : 1) || pr(a) - pr(b));
  const B: Record<string, TaskEntry[]> = { Overdue: [], Today: [], Tomorrow: [], 'This week': [], Later: [], 'No date': [] };
  for (const o of open) {
    if (!o.ds) B['No date']!.push(o);
    else if (dueAt(o.it, o.ds, s) < now) B['Overdue']!.push(o);
    else { const diff = Math.round((day(o.ds).getTime() - today.getTime()) / 86400000); (diff === 0 ? B['Today']! : diff === 1 ? B['Tomorrow']! : diff <= 7 ? B['This week']! : B['Later']!).push(o); }
  }
  return { groups: Object.entries(B).filter(([, l]) => l.length) as Array<[string, TaskEntry[]]>, done: done.reverse(), open: open.length, overdue: B['Overdue']!.length, urgent: B['Overdue']!.length + B['Today']!.length };
}

// ---- history ----

export type HistoryRow = { it: Item; ds: string | null; when: number; kind: 'done' | 'past' };

export function historyRows(items: Item[], s: Settings, now = Date.now()): HistoryRow[] {
  const today = day(ymd(new Date(now))), rows: HistoryRow[] = [];
  for (const it of items) {
    if (!it.date) { if (it.type !== 'event' && it.done) rows.push({ it, ds: null, when: it.doneAt || 0, kind: 'done' }); continue; }
    if (it.type !== 'event') {
      if (!isRepeat(it) && it.done) rows.push({ it, ds: it.date, when: it.doneAt || dueAt(it, it.date, s), kind: 'done' });
      if (isRepeat(it)) for (const ds of it.doneOn || []) rows.push({ it, ds, when: dueAt(it, ds, s), kind: 'done' });
    } else if (!isRepeat(it)) {
      if (endOf(it, it.date).getTime() < now) rows.push({ it, ds: it.date, when: dueAt(it, it.date, s), kind: 'past' });
    } else {
      for (let i = 0; i < 120; i++) {
        const d = addDays(today, -i), ds = ymd(d);
        if (ds < it.date) break;
        if (occursOn(it, ds) && endOf(it, ds).getTime() < now) rows.push({ it, ds, when: dueAt(it, ds, s), kind: 'past' });
      }
    }
  }
  return rows.sort((a, b) => b.when - a.when);
}

export const lateText = (ms: number) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? '' : 's'}`; };

export function groupLabel(ms: number, now = Date.now()): string {
  if (!ms) return 'Earlier';
  const d = new Date(ms), n = new Date(now), dd = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (dd <= 0) return 'Today';
  if (dd === 1) return 'Yesterday';
  if (dd < 7) return DOWL[d.getDay()]!;
  return `${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export function historyStats(all: HistoryRow[], s: Settings, now = Date.now()) {
  const m30 = now - 30 * 86400000;
  const doneRecent = all.filter((r) => r.kind === 'done' && r.when >= m30);
  const withData = doneRecent.filter((r) => r.it.type === 'assignment' && !isRepeat(r.it) && r.it.doneAt && r.ds);
  const onTime = withData.filter((r) => r.it.doneAt! <= dueAt(r.it, r.ds!, s)).length;
  return { completed: doneRecent.length, onTime: withData.length ? `${Math.round((onTime / withData.length) * 100)}%` : 'None yet', events: all.filter((r) => r.kind === 'past' && r.when >= m30).length };
}

export const completedText = (doneAt: number) => { const d = new Date(doneAt); return `Completed ${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]!.slice(0, 3)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// ---- search ----

export function search(items: Item[], text: string, now = Date.now()): Item[] {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const today = day(ymd(new Date(now))).getTime();
  const kind = (t: string) => (t === 'assignment' ? 'assignment' : t === 'event' ? 'event' : 'to-do');
  return items
    .filter((it) => { const hay = `${it.title} ${it.notes} ${it.location || ''} ${it.category} ${kind(it.type)} ${it.date}`.toLowerCase(); return words.every((w) => hay.includes(w)); })
    .sort((a, b) => Number(!!a.done) - Number(!!b.done) || Math.abs(day(a.date || '2100-01-01').getTime() - today) - Math.abs(day(b.date || '2100-01-01').getTime() - today))
    .slice(0, 8);
}

export { hm };
