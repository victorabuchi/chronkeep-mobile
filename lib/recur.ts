import type { Item } from './types';

// Which days an item appears on: repeats with an end date, skipped days, and events that run past midnight or
// over several days. A port of the web app's public/recur.js (same rules, same tests).

type Dated = Pick<Item, 'date' | 'type'> & Partial<Pick<Item, 'time' | 'endTime' | 'endDate' | 'repeat' | 'repeatUntil' | 'skip'>>;

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const day = (s: string) => new Date(`${s}T00:00:00`);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const toMin = (t: string) => {
  const [h = 0, m = 0] = String(t).split(':').map(Number);
  return h * 60 + m;
};
export const isRepeat = (it: { repeat?: string }) => !!it.repeat && it.repeat !== 'none';

// Does an occurrence START on day d?
export function occursOn(it: Dated, d: Date | string): boolean {
  if (!it.date) return false;
  const dd = typeof d === 'string' ? d : ymd(d);
  if (dd < it.date) return false;
  if (it.repeatUntil && dd > it.repeatUntil) return false;
  if ((it.skip ?? []).includes(dd)) return false;
  const s = day(it.date), x = day(dd);
  switch (it.repeat) {
    case 'daily': return true;
    case 'weekly': return x.getDay() === s.getDay();
    case 'monthly': return x.getDate() === s.getDate();
    default: return dd === it.date;
  }
}

// How many days after the start an event runs. An end time earlier than the start time means "next day".
export function spanDays(it: Dated): number {
  if (it.type !== 'event' || !it.date) return 0;
  let end = it.endDate;
  if (!end && it.time && it.endTime && toMin(it.endTime) <= toMin(it.time)) end = ymd(addDays(day(it.date), 1));
  if (!end || end <= it.date) return 0;
  return Math.round((day(end).getTime() - day(it.date).getTime()) / 86400000);
}

// The start date of the occurrence that covers day d (itself, or an earlier day of a long event), or null.
export function startFor(it: Dated, d: Date | string): string | null {
  const x = day(typeof d === 'string' ? d : ymd(d)), n = spanDays(it);
  for (let k = 0; k <= n; k++) {
    const s = addDays(x, -k);
    if (occursOn(it, s)) return ymd(s);
  }
  return null;
}

export type Segment = { occ: string; first: boolean; last: boolean; start: number; end: number };

// A timed event on one day, in minutes from midnight, clamped to the hours shown.
export function segment(it: Dated, d: Date | string, lo: number, hi: number): Segment | null {
  const occ = startFor(it, d);
  if (!occ || !it.time) return null;
  const n = spanDays(it), k = Math.round((day(typeof d === 'string' ? d : ymd(d)).getTime() - day(occ).getTime()) / 86400000);
  const first = k === 0, last = k === n, start = first ? toMin(it.time) : lo;
  let end = last ? (it.endTime ? toMin(it.endTime) : toMin(it.time) + 60) : hi;
  if (last && it.endTime && n === 0 && end <= start) end = start + 15;
  return { occ, first, last, start, end };
}

// When an occurrence that started on `occ` is over.
export function endOf(it: Dated, occ: string): Date {
  const x = addDays(day(occ), spanDays(it));
  if (it.endTime) {
    const [h = 0, m = 0] = it.endTime.split(':').map(Number);
    x.setHours(h, m, 0, 0);
  } else if (it.time) {
    const [h = 0, m = 0] = it.time.split(':').map(Number);
    x.setHours(h, m + 60, 0, 0);
  } else x.setHours(23, 59, 59, 0);
  return x;
}
