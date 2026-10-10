process.env.TZ = 'Europe/Helsinki';
import { defaultSettings } from '../lib/defaults';
import { newItem } from '../lib/items';
import { plan, upcomingList, activeRule } from '../lib/schedule';
import type { Item } from '../lib/types';

// "Now" is Saturday 10 October 2026, 12:00.
const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime();
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m, 0).getTime();
const settings = (over = {}) => ({ ...defaultSettings(), digestHour: -1, nagHours: 0, ...over });
const item = (over: Partial<Item>) => newItem({ updatedAt: at(9, 12), createdAt: at(9, 12), ...over });
const run = (items: Item[], over = {}, snoozed = {}) => plan({ items, settings: settings(over), snoozed, now: NOW });
const times = (p: { at: number }[]) => p.map((x) => new Date(x.at)).map((d) => `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);

test('one-off reminders: only the ones still ahead, worded like the web', () => {
  const a = item({ type: 'assignment', title: 'Essay', category: 'Study', date: '2026-10-11', time: '23:59', reminders: [4320, 1440, 180] });
  const p = run([a]);
  expect(times(p)).toEqual(['10 23:59', '11 20:59']); // 3 days before is already past
  expect(p[0]).toMatchObject({ title: 'Assignment: Essay', body: 'Due in 1 day (Sun 11 Oct at 23:59), Study', kind: 'reminder', itemId: a.id, date: '2026-10-11' });
  expect(p[1]!.body).toBe('Due in 3 hours (Sun 11 Oct at 23:59), Study');
});

test('"at time" says Due now, and an item with no time uses the all-day hour', () => {
  const p = run([item({ type: 'todo', title: 'Call', date: '2026-10-11', reminders: [0] })]);
  expect(times(p)).toEqual(['11 09:00']);
  expect(p[0]!.body).toBe('Due now (Sun 11 Oct)');
});

test('repeating reminders: the latest rule that has started takes over', () => {
  const a = item({ type: 'assignment', title: 'Quiz', date: '2026-10-10', time: '15:00', nudges: [{ from: 240, every: 60 }, { from: 60, every: 10 }] });
  const p = run([a]);
  expect(times(p)).toEqual(['10 13:00', '10 14:00', '10 14:10', '10 14:20', '10 14:30', '10 14:40', '10 14:50']);
  expect(p[0]!.body).toBe('Due in 2 h (today at 15:00). Reminding every 1 h. Tick it off to stop.');
  expect(p[3]!.body).toBe('Due in 40 min (today at 15:00). Reminding every 10 min. Tick it off to stop.');
});

test('rules that have not started yet begin at their start, and hand over to the next rule', () => {
  const a = item({ type: 'assignment', title: 'Quiz', date: '2026-10-10', time: '15:20', nudges: [{ from: 180, every: 60 }, { from: 60, every: 10 }] });
  expect(times(run([a]))).toEqual(['10 12:20', '10 13:20', '10 14:20', '10 14:30', '10 14:40', '10 14:50', '10 15:00', '10 15:10']);
});

test('a rule that has not started yet begins at its start, "from the start of the due day" included', () => {
  const a = item({ type: 'assignment', title: 'Report', date: '2026-10-11', time: '23:59', nudges: [{ from: 'day', every: 360 }] });
  expect(times(run([a]))).toEqual(['11 00:00', '11 06:00', '11 12:00', '11 18:00']);
});

test('just saved: the first reminder comes right away, then on a grid from the save', () => {
  const a = item({ type: 'assignment', title: 'Report', date: '2026-10-12', time: '23:59', updatedAt: NOW, nudges: [{ from: 525600, every: 30 }] });
  const p = run([a]);
  expect(p[0]!.at).toBe(NOW + 3000);
  expect(times(p).slice(1, 4)).toEqual(['10 12:30', '10 13:00', '10 13:30']);
});

test('a re-plan gives the same times (nothing drifts)', () => {
  const a = item({ type: 'assignment', title: 'Report', date: '2026-10-12', time: '23:59', nudges: [{ from: 525600, every: 30 }] });
  const first = run([a]), later = plan({ items: [a], settings: settings(), snoozed: {}, now: NOW + 7 * 60000 });
  expect(times(later)[0]).toBe(times(first)[0]);
});

test('done items and ticked-off occurrences make no notifications', () => {
  const done = item({ type: 'assignment', title: 'Done', date: '2026-10-11', time: '23:59', reminders: [180], done: true });
  const series = item({ type: 'assignment', title: 'Daily', date: '2026-10-10', time: '23:59', repeat: 'daily', reminders: [180], doneOn: ['2026-10-11'] });
  const p = run([done, series]);
  expect(p.filter((x) => x.itemId === done.id)).toHaveLength(0);
  expect(p.filter((x) => x.itemId === series.id).map((x) => x.date)).toEqual(['2026-10-10', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].filter((d) => d >= '2026-10-10' && at(Number(d.slice(8)), 20, 59) > NOW));
});

test('a snooze pauses the item and reminds again when it ends', () => {
  const a = item({ type: 'assignment', title: 'Quiz', date: '2026-10-10', time: '15:00', reminders: [60], nudges: [{ from: 180, every: 60 }] });
  const p = run([a], {}, { [`${a.id}@2026-10-10`]: at(10, 13, 30) });
  expect(p).toHaveLength(1);
  expect(p[0]).toMatchObject({ at: at(10, 13, 30), body: 'Your snooze is over.', kind: 'reminder' });
});

test('an expired snooze is ignored', () => {
  const a = item({ type: 'todo', title: 'x', date: '2026-10-10', time: '15:00', reminders: [60] });
  expect(run([a], {}, { [`${a.id}@2026-10-10`]: at(10, 9) })).toHaveLength(1);
});

test('overdue and not ticked: nags every N hours on a grid from the due time', () => {
  const a = item({ type: 'assignment', title: 'Late', date: '2026-10-09', time: '23:59' });
  expect(times(run([a], { nagHours: 6 }))).toEqual(['10 17:59', '10 23:59', '11 05:59', '11 11:59']);
  expect(run([a], { nagHours: 0 })).toHaveLength(0);
  expect(run([{ ...a, type: 'event' }], { nagHours: 6 })).toHaveLength(0);
});

test('morning summary lists what is due and what is overdue', () => {
  const due = item({ type: 'assignment', title: 'Due Sunday', date: '2026-10-11', time: '23:59' });
  const late = item({ type: 'assignment', title: 'Missed', date: '2026-10-08', time: '23:59' });
  const p = run([due, late], { digestHour: 8 }).filter((x) => x.kind === 'summary');
  expect(p[0]).toMatchObject({ at: at(11, 8), title: 'Today: 1 due, 1 overdue', body: '! Missed, Due Sunday' });
});

test('turned off, or nothing to say, plans nothing', () => {
  expect(run([item({ type: 'todo', title: 'x', date: '2026-10-11', reminders: [0] })], { notify: false })).toEqual([]);
  expect(run([item({ type: 'todo', title: 'No date', reminders: [0] })])).toEqual([]);
});

test('sorted by time with unique ids, and the bell shows each repeating reminder once', () => {
  const a = item({ type: 'assignment', title: 'A', date: '2026-10-11', time: '23:59', reminders: [180], nudges: [{ from: 'day', every: 360 }] });
  const b = item({ type: 'assignment', title: 'B', date: '2026-10-10', time: '23:59', reminders: [600] });
  const p = run([a, b]);
  expect(p.map((x) => x.at)).toEqual([...p.map((x) => x.at)].sort((x, y) => x - y));
  expect(new Set(p.map((x) => x.id)).size).toBe(p.length);
  const up = upcomingList(p, NOW);
  expect(up.filter((x) => x.kind === 'repeat')).toHaveLength(1);
});

test('activeRule matches the web server', () => {
  const it = { nudges: [{ from: 525600, every: 30 }, { from: 'day' as const, every: 10 }] };
  const due = at(12, 23, 59);
  expect(activeRule(it, due, at(10, 12))).toEqual({ from: 525600, every: 30 }); // two days out: only "right away" applies
  expect(activeRule(it, due, at(12, 6))).toEqual({ from: 1439, every: 10 }); // on the due day the specific rule wins
  expect(activeRule(it, due, at(13, 1))).toBeNull(); // after the due time
});
