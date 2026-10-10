import { defaultSettings } from '../lib/defaults';
import { groupDue, mergeEntries, splitDay, stripOf } from '../lib/due';
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

test('a day splits into hours and strip: timed events go in the hours, deadlines in the strip', () => {
  const items = [newItem({ id: 'l', type: 'event', title: 'Lecture', date: '2026-10-13', time: '10:00', endTime: '12:00' }), task('t', 'Essay'), newItem({ id: 'night', type: 'event', title: 'Late', date: '2026-10-13', time: '23:00', endTime: '23:30' })];
  const r = splitDay(items, '2026-10-13', s, 'all');
  expect(r.timed.map((x) => x.it.id)).toEqual(['l']);
  expect(r.due.map((x) => x.id)).toEqual(['t', 'night']); // after the last hour shown: strip
  expect(splitDay(items, '2026-10-13', s, 'event').due.map((x) => x.id)).toEqual(['night']);
});

test('tasks that share a title and day merge into one row', () => {
  const m = mergeEntries([{ it: task('a', 'Attendance'), ds: '2026-10-13' }, { it: task('b', 'Attendance'), ds: '2026-10-13' }, { it: task('c', 'Attendance'), ds: '2026-10-14' }]);
  expect(m.map((g) => g.map((o) => o.it.id))).toEqual([['a', 'b'], ['c']]);
});
