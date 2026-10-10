import * as ics from './ics';
import { newItem } from './items';
import type { Item } from './types';

// Subscribing to calendar links and importing calendar files. A port of the web app's lib/calsync.js.

const MAX_BYTES = 8 * 1024 * 1024;

type FetchFn = typeof fetch;

// Downloads a calendar link. Throws a message that is fit to show to the person.
export async function fetchCalendar(url: string, fetchFn: FetchFn = fetch): Promise<string> {
  let u: URL;
  try { u = new URL(url); } catch { throw new Error('That is not a web address.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Use an http or https link.');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  let res: Response;
  try { res = await fetchFn(u.toString(), { signal: ctl.signal, headers: { Accept: 'text/calendar, */*' }, redirect: 'follow' }); }
  catch (e) { throw new Error(e && (e as Error).name === 'AbortError' ? 'The calendar took too long to answer.' : 'Could not reach that link.'); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw new Error(`The link answered with an error (${res.status}).`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('That calendar is too large.');
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error('That calendar is too large.');
  if (!/^\s*BEGIN:VCALENDAR/i.test(text)) throw new Error('That link did not return a calendar.');
  return text;
}

const FIELDS = ['title', 'notes', 'location', 'date', 'time', 'endTime', 'endDate'] as const;
const fieldsOf = (ev: ics.ParsedEvent) => ({ type: 'event' as const, title: ev.title, notes: ev.notes, location: ev.location, date: ev.date, time: ev.time, endTime: ev.endTime, endDate: ev.endDate });

export type Source = { id: string; category: string };
export type Db = { items: Item[]; ignored: string[] };
export type Opts = { today: string; reminders?: number[]; prime?: (it: Item) => void };
export type Result = { created: number; updated: number; removed: number };

// Brings the items that came from one source in line with the events it lists now.
//  - new events are added (with the usual reminders), changed ones are updated, ones you deleted stay deleted
//  - events that vanished from the source are removed if they are still ahead of us (cancelled), kept if past
export function applyEvents(db: Db, source: Source, events: ics.ParsedEvent[], { prime = () => undefined, today, reminders = [] }: Opts): Result {
  const existing = new Map(db.items.filter((i) => i.source && i.source.feed === source.id).map((i) => [i.source!.key, i]));
  const ignored = new Set(db.ignored || []);
  const seen = new Set<string>(), res: Result = { created: 0, updated: 0, removed: 0 };
  for (const ev of events) {
    if (ignored.has(`${source.id}|${ev.key}`)) continue;
    seen.add(ev.key);
    const it = existing.get(ev.key), f = fieldsOf(ev);
    if (!it) {
      const item = newItem({ reminders: [...reminders], category: source.category || '', ...f, source: { feed: source.id, key: ev.key } });
      prime(item); db.items.push(item); res.created++;
    } else if (FIELDS.some((k) => (it[k] || '') !== (f[k] || ''))) {
      const timeChanged = it.date !== f.date || it.time !== f.time;
      Object.assign(it, f, { updatedAt: Date.now() });
      if (timeChanged) prime(it);
      res.updated++;
    }
  }
  for (const [key, it] of existing) {
    if (seen.has(key)) continue;
    if ((it.endDate || it.date) >= today) { db.items = db.items.filter((x) => x !== it); res.removed++; }
  }
  return res;
}

// Reads calendar text and applies it. Throws if there is nothing readable in it.
export function importText(db: Db, source: Source, text: string, opts: Opts): Result {
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('That does not look like a calendar file.');
  return applyEvents(db, source, ics.parse(text), opts);
}
