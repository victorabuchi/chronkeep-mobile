import { human, lead, pad, typeLabel, fmtDay, hm } from './dates';
import { addDays, day, isRepeat, occursOn, ymd } from './recur';
import type { Item, Nudge, Planned, Settings } from './types';

// When the phone should show each reminder. The web server checks every 20 seconds; a phone cannot run in the
// background, so this works the times out in advance and hands them to the operating system as local notifications.
// The rules are the web server's (server.js tick/upcoming): one-off reminders, repeating reminders where the latest
// rule that has started wins, overdue nags, a morning summary, and snoozes.

export const IOS_LIMIT = 60; // iOS keeps at most 64 pending local notifications

const HORIZON_DAYS = 9;

const isDoneOn = (it: Item, d: Date | string) => (isRepeat(it) ? (it.doneOn || []).includes(typeof d === 'string' ? d : ymd(d)) : it.done);

// The due time (or start) of the occurrence on day d. Items with no time use the all-day hour.
function atOn(it: Item, ds: string, allDayHour: number): number {
  const [h, m] = (it.time || `${pad(allDayHour)}:00`).split(':').map(Number);
  const x = day(ds);
  x.setHours(h ?? 0, m ?? 0, 0, 0);
  return x.getTime();
}

// Minutes before the due time that a repeating-reminder rule starts.
const startsBefore = (r: Nudge, at: number) => (r.from === 'day' ? (at - new Date(at).setHours(0, 0, 0, 0)) / 60000 : Number(r.from));

// The repeating-reminder rule in force right now: of the rules that have started, the most specific.
export function activeRule(it: Pick<Item, 'nudges'>, due: number, now: number): { from: number; every: number } | null {
  const left = (due - now) / 60000;
  if (left <= 0) return null;
  let best: { from: number; every: number } | null = null;
  for (const r of it.nudges || []) {
    const from = startsBefore(r, due);
    if (left <= from && (!best || from < best.from)) best = { from, every: Number(r.every) };
  }
  return best;
}

export type PlanInput = { items: Item[]; settings: Settings; snoozed: Record<string, number>; now?: number };

export function plan({ items, settings, snoozed, now = Date.now() }: PlanInput): Planned[] {
  if (!settings.notify) return [];
  const out: Planned[] = [];
  const horizon = now + HORIZON_DAYS * 86400000;
  const today = day(ymd(new Date(now)));
  const allDay = settings.allDayHour;
  const snoozedNow = (id: string, ds: string) => (snoozed[`${id}@${ds}`] ?? 0) > now;

  for (const it of items) {
    if (!it.date) continue;
    const label = `${typeLabel(it.type)}: ${it.title}`;
    for (let off = -1; off <= 14; off++) {
      const d = addDays(today, off), ds = ymd(d);
      if (!occursOn(it, ds) || isDoneOn(it, ds)) continue;
      const at = atOn(it, ds, allDay);
      const when = `${ds === ymd(today) ? 'today' : fmtDay(ds)}${it.time ? ' at ' + it.time : ''}`;
      if (snoozedNow(it.id, ds)) continue;

      // One-off reminders before the due time.
      for (const rem of it.reminders || []) {
        const fire = at - rem * 60000;
        if (fire > now && fire <= horizon) out.push({ id: `r|${it.id}|${ds}|${rem}`, at: fire, title: label, body: `${rem > 0 ? `Due in ${lead(rem)}` : 'Due now'} (${when})${it.category ? ', ' + it.category : ''}`, itemId: it.id, date: ds, kind: 'reminder' });
      }

      // Repeating reminders until it is ticked off. The latest rule that has started takes over; times sit on a grid
      // that starts when the rule starts (or when the item was last edited, for "right away"), so a re-plan gives the
      // same times instead of drifting.
      const rules = [...(it.nudges || [])].filter((r) => r.every > 0).sort((a, b) => startsBefore(b, at) - startsBefore(a, at));
      if (at > now && rules.length) {
        let made = 0;
        rules.forEach((r, i) => {
          const start = at - startsBefore(r, at) * 60000, end = i + 1 < rules.length ? at - startsBefore(rules[i + 1]!, at) * 60000 : at;
          const every = r.every * 60000, anchor = Math.max(start, it.updatedAt || 0);
          if (anchor >= now - 5000 && anchor < end && anchor <= now + 5000 && made < 30) {
            // the rule is active and the item was only just saved: the first reminder comes right away
            out.push({ id: `n|${it.id}|${ds}|now`, at: now + 3000, title: label, body: `Due in ${human((at - now) / 60000)} (${when}). Reminding every ${human(r.every)}. Tick it off to stop.`, itemId: it.id, date: ds, kind: 'repeat' });
            made++;
          }
          let t = anchor + Math.max(0, Math.floor((now - anchor) / every) + 1) * every;
          for (; t < end && t <= horizon && made < 30; t += every) {
            out.push({ id: `n|${it.id}|${ds}|${Math.round(t / 1000)}`, at: t, title: label, body: `Due in ${human((at - t) / 60000)} (${when}). Reminding every ${human(r.every)}. Tick it off to stop.`, itemId: it.id, date: ds, kind: 'repeat' });
            made++;
          }
        });
      }
    }

    // Overdue and still not ticked: keep nagging.
    if (settings.nagHours > 0 && !isRepeat(it) && !it.done && it.type !== 'event' && !snoozedNow(it.id, it.date)) {
      const due = atOn(it, it.date, allDay), step = settings.nagHours * 3600000;
      if (now - due < 14 * 86400000) {
        let t = due + Math.max(1, Math.floor((now - due) / step) + 1) * step, n = 0;
        for (; t <= horizon && t - due < 14 * 86400000 && n < 4; t += step, n++) out.push({ id: `o|${it.id}|${Math.round(t / 1000)}`, at: t, title: `OVERDUE: ${it.title}`, body: `${typeLabel(it.type)} was due ${fmtDay(it.date)}${it.time ? ', ' + it.time : ''}. Tick it off in ChronKeep when done.`, itemId: it.id, date: it.date, kind: 'overdue' });
      }
    }
  }

  // A snooze that runs out: remind again.
  for (const [key, until] of Object.entries(snoozed)) {
    if (until <= now) continue;
    const [id, ds] = key.split('@') as [string, string], it = items.find((x) => x.id === id);
    if (it && !isDoneOn(it, ds)) out.push({ id: `s|${key}`, at: until, title: `${typeLabel(it.type)}: ${it.title}`, body: 'Your snooze is over.', itemId: id, date: ds, kind: 'reminder' });
  }

  // Morning summary.
  if (settings.digestHour >= 0) {
    for (let k = 0; k < 7; k++) {
      const d = addDays(today, k), ds = ymd(d), t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), settings.digestHour, 0, 0, 0).getTime();
      if (t <= now) continue;
      const due = items.filter((it) => it.date && it.type !== 'event' && occursOn(it, ds) && !isDoneOn(it, ds) && (isRepeat(it) || it.date === ds));
      const late = items.filter((it) => it.date && !isRepeat(it) && !it.done && it.type !== 'event' && it.date < ds);
      if (!due.length && !late.length) continue;
      const names = [...late.map((i) => '! ' + i.title), ...due.map((i) => i.title)].slice(0, 6).join(', ');
      out.push({ id: `d|${ds}`, at: t, title: `Today: ${due.length} due${late.length ? `, ${late.length} overdue` : ''}`, body: names, itemId: null, date: ds, kind: 'summary' });
    }
  }

  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

// For the bell: what is still to come, with each repeating reminder shown once (its next time).
export function upcomingList(planned: Planned[], now = Date.now()): Planned[] {
  const seen = new Set<string>(), out: Planned[] = [];
  for (const p of planned) {
    if (p.at <= now) continue;
    if (p.kind === 'repeat') { const k = `${p.itemId}|${p.date}`; if (seen.has(k)) continue; seen.add(k); }
    out.push(p);
  }
  return out.slice(0, 30);
}

export { hm };
