import { defaultSettings } from '../lib/defaults';
import { groupDue, mergeEntries, splitDay, stripOf, upcomingEvents } from '../lib/due';
import { newItem } from '../lib/items';

const s = defaultSettings();
const task = (id: string, title: string, o = {}) => newItem({ id, type: 'assignment', title, date: '2026-10-13', time: '10:00', ...o });

test('same-title deadlines on a day merge into one group, others stay alone', () => {
  const g = groupDue([task('a', 'Attendance'), task('b', 'attendance '), task('c', 'Quiz'), newItem({ id: 'e', type: 'event', title: 'Attendance', date: '2026-10-13' })]);
  expect(g.map((x) => x.map((i) => i.id))).toEqual([['a', 'b'], ['c'], ['e']]);
});

test('a day shows three groups, or two and "+N more" for the rest', () => {
  const four = [task('a', 'A'), task('b', 'B'), task('c', 'C'), task('d', 'D'), task('e', 'D')];
  expect(stripOf(four.slice(0, 3))).toEqual({ shown: [[four[0]], [four[1]], [four[2]]], rest: 0 });
  const s4 = stripOf(four);
  expect(s4.shown).toHaveLength(2); expect(s4.rest).toBe(3);
});

test('assignments are blocks in the hours ending at their due time; same title and minute merge; a late time sits at the edge', () => {
  const items = [task('a', 'Attendance', { time: '10:00' }), task('b', 'Attendance', { time: '10:00' }), task('c', 'Essay', { time: '23:59' })];
  const r = splitDay(items, '2026-10-13', s, 'all');
  expect(r.due).toEqual([]);
  const blocks = r.timed.filter((b) => b.asg);
  expect(blocks.map((b) => [b.it.title, b.group!.length, b.s, b.e])).toEqual([['Attendance', 2, 540, 600], ['Essay', 1, 1260, 1320]]); // 23:59 is past the 22:00 end of the day
  expect(r.deadlines.map((i) => i.id)).toEqual(['a', 'b', 'c']);
});

test('a day splits into hours and strip: timed events go in the hours, deadlines in the strip', () => {
  const items = [newItem({ id: 'l', type: 'event', title: 'Lecture', date: '2026-10-13', time: '10:00', endTime: '12:00' }), newItem({ id: 't', type: 'todo', title: 'Buy milk', date: '2026-10-13', time: '10:00' }), newItem({ id: 'night', type: 'event', title: 'Late', date: '2026-10-13', time: '23:00', endTime: '23:30' })];
  const r = splitDay(items, '2026-10-13', s, 'all');
  expect(r.timed.map((x) => x.it.id)).toEqual(['l']); // (a to-do is not a block in the hours)
  expect(r.due.map((x) => x.id)).toEqual(['t', 'night']); // after the last hour shown: strip
  expect(splitDay(items, '2026-10-13', s, 'event').due.map((x) => x.id)).toEqual(['night']);
});

test('tasks that share a title and day merge into one row', () => {
  const m = mergeEntries([{ it: task('a', 'Attendance'), ds: '2026-10-13' }, { it: task('b', 'Attendance'), ds: '2026-10-13' }, { it: task('c', 'Attendance'), ds: '2026-10-14' }]);
  expect(m.map((g) => g.map((o) => o.it.id))).toEqual([['a', 'b'], ['c']]);
});

test('the Events tab lists events starting in the next 30 days that are not over, grouped by when', () => {
  const now = new Date('2026-10-12T09:00:00').getTime();
  const ev = (id: string, date: string, time: string, endTime: string) => newItem({ id, type: 'event', title: id, date, time, endTime });
  const r = upcomingEvents([ev('over', '2026-10-12', '07:00', '08:00'), ev('now', '2026-10-12', '08:00', '10:00'), ev('tomorrow', '2026-10-13', '09:00', '10:00'), ev('later', '2026-10-30', '09:00', '10:00'), ev('far', '2026-12-30', '09:00', '10:00'), task('t', 'Not an event')], now);
  expect(r.map(([name, l]) => [name, l.map((x) => x.it.id)])).toEqual([['Today', ['now']], ['Tomorrow', ['tomorrow']], ['Later', ['later']]]);
});
