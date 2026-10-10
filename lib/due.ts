import { segment } from './recur';
import { matchesFilter, showsOn, type TaskEntry } from './selectors';
import { lanes } from './calendar-layout';
import type { Item, Settings } from './types';
import type { TypeFilter } from './ui-state';

// The deadline strip at the top of each calendar day, like the web's. A day's items split into the timed events that go in
// the hours, and everything else (deadlines, all-day items, events outside the hours shown) for the strip.
export function splitDay(items: Item[], ds: string, settings: Settings, typeF: TypeFilter) {
  const top0 = settings.dayStart * 60, lim = settings.dayEnd * 60;
  const timed: Array<{ it: Item; sg: NonNullable<ReturnType<typeof segment>>; s: number; e: number }> = [], due: Item[] = [];
  for (const it of items) {
    if (!matchesFilter(it, typeF) || !showsOn(it, ds)) continue;
    if (it.type === 'event' && it.time) {
      const sg = segment(it, ds, top0, lim)!, e = sg.first && sg.last ? Math.max(sg.start + 15, sg.end) : sg.end;
      if (e <= top0 || sg.start >= lim) due.push(it); else timed.push({ it, sg, s: Math.max(sg.start, top0), e: Math.min(e, lim) });
    } else due.push(it);
  }
  due.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  return { due, timed: lanes(timed) };
}

// Deadlines that share a title on one day ("Attendance at the exercise sessions" six times) become one group with a count.
export function groupDue(list: Item[]): Item[][] {
  const map = new Map<string, Item[]>();
  for (const it of list) {
    const k = it.type === 'event' ? it.id : `${it.type}|${it.title.trim().toLowerCase()}`;
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return [...map.values()];
}

export const DUE_SLOTS = 3; // groups a day shows before "+N more"

// What a day's strip shows: up to DUE_SLOTS groups, or DUE_SLOTS - 1 and a "+N more" for the rest.
export function stripOf(list: Item[], slots = DUE_SLOTS): { shown: Item[][]; rest: number } {
  const groups = groupDue(list);
  if (groups.length <= slots) return { shown: groups, rest: 0 };
  return { shown: groups.slice(0, slots - 1), rest: groups.slice(slots - 1).reduce((n, g) => n + g.length, 0) };
}

// Tasks that share a title and a day become one row with a count; ticking it ticks them all.
export function mergeEntries(list: TaskEntry[]): TaskEntry[][] {
  const out: TaskEntry[][] = [], seen = new Map<string, TaskEntry[]>();
  for (const o of list) {
    const k = `${o.it.type}|${o.it.title.trim().toLowerCase()}|${o.ds ?? ''}|${o.it.done ? 1 : 0}`;
    const g = seen.get(k);
    if (g) g.push(o); else { const n = [o]; seen.set(k, n); out.push(n); }
  }
  return out;
}
