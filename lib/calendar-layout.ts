import { DOW, DOWL, MON } from './dates';
import { addDays, day, ymd } from './recur';
import type { Settings } from './types';
import type { View } from './ui-state';

// The calendar's geometry and wording, ported from the web app's public/js/020-calendar.js.

export const HH = 56; // pixels per hour, as on the web

// Which days a view shows. On a phone the week is three days from the one you are on.
export function daysFor(view: View, cur: string, s: Settings): string[] {
  if (view === 'day') return [cur];
  if (view === '3days') return [0, 1, 2].map((i) => ymd(addDays(day(cur), i)));
  return [];
}

// The weeks of a month view: rows of 7 day strings, starting on the week-start day.
export function monthWeeks(cur: string, s: Settings): string[][] {
  const c = day(cur), first = new Date(c.getFullYear(), c.getMonth(), 1), lead = (first.getDay() - s.weekStart + 7) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
  const inMonth = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((lead + inMonth) / 7);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => ymd(addDays(start, w * 7 + i))));
}

export const dayHeads = (s: Settings) => Array.from({ length: 7 }, (_, i) => DOW[(i + s.weekStart) % 7]!);

export function title(view: View, days: string[], cur: string): string {
  const c = day(cur);
  if (view === 'month') return `${MON[c.getMonth()]} ${c.getFullYear()}`;
  if (view === 'day') return `${DOWL[c.getDay()]}, ${MON[c.getMonth()]} ${c.getDate()}, ${c.getFullYear()}`;
  const a = day(days[0]!), b = day(days[days.length - 1]!);
  return a.getMonth() === b.getMonth() ? `${MON[a.getMonth()]} ${a.getDate()} to ${b.getDate()}, ${b.getFullYear()}` : `${MON[a.getMonth()]!.slice(0, 3)} ${a.getDate()} to ${MON[b.getMonth()]!.slice(0, 3)} ${b.getDate()}, ${b.getFullYear()}`;
}

export const eyebrow = (view: View) => (view === '3days' ? '3 days' : view === 'day' ? 'Day' : 'Month');

// Moving to the previous or next stretch: a month, three days or a day.
export function step(view: View, cur: string, n: number): string {
  const c = day(cur);
  if (view === 'month') return ymd(new Date(c.getFullYear(), c.getMonth() + n, 1));
  return ymd(addDays(c, n * (view === '3days' ? 3 : 1)));
}

export type Laid<T> = T & { s: number; e: number; lane: number; n: number };

// Overlapping events share the column width: each gets a lane, and every cluster knows how many lanes it has.
export function lanes<T extends { s: number; e: number }>(list: T[]): Array<Laid<T>> {
  const sorted = [...list].sort((a, b) => a.s - b.s || a.e - b.e) as Array<Laid<T>>;
  let group: Array<Laid<T>> = [], gEnd = 0;
  const flush = () => { const n = Math.max(0, ...group.map((g) => g.lane)) + 1; group.forEach((g) => (g.n = n)); group = []; gEnd = 0; };
  for (const ev of sorted) {
    if (group.length && ev.s >= gEnd) flush();
    const used = group.filter((g) => g.e > ev.s).map((g) => g.lane);
    let l = 0; while (used.includes(l)) l++;
    ev.lane = l; group.push(ev); gEnd = Math.max(gEnd, ev.e);
  }
  flush();
  return sorted;
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const snap15 = (m: number) => Math.round(m / 15) * 15;
