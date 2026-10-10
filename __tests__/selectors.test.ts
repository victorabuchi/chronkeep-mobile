process.env.TZ = 'Europe/Helsinki';
import { defaultSettings } from '../lib/defaults';
import { newItem } from '../lib/items';
import { dueAt, groupLabel, historyRows, historyStats, nextOcc, rel, search, taskGroups } from '../lib/selectors';

const NOW = new Date(2026, 9, 10, 12, 0, 0).getTime(); // Sat 10 Oct 2026, 12:00
const s = defaultSettings();
const it = (o: object) => newItem({ updatedAt: 0, createdAt: 0, ...o });

test('tasks are grouped by how soon they are due, soonest first, priority breaking ties', () => {
  const items = [
    it({ type: 'assignment', title: 'Missed', date: '2026-10-09', time: '12:00' }),
    it({ type: 'assignment', title: 'Tonight', date: '2026-10-10', time: '23:59' }),
    it({ type: 'todo', title: 'Tomorrow lo', date: '2026-10-11', priority: 'low' }),
    it({ type: 'todo', title: 'Tomorrow hi', date: '2026-10-11', priority: 'high' }),
    it({ type: 'assignment', title: 'Midweek', date: '2026-10-14', time: '10:00' }),
    it({ type: 'assignment', title: 'Far', date: '2026-11-30' }),
    it({ type: 'todo', title: 'Someday' }),
    it({ type: 'event', title: 'An event', date: '2026-10-11', time: '10:00' }),
  ];
  const g = taskGroups(items, 'all', s, NOW);
  expect(g.groups.map(([n, l]) => [n, l.map((e) => e.it.title)])).toEqual([
    ['Overdue', ['Missed']], ['Today', ['Tonight']], ['Tomorrow', ['Tomorrow hi', 'Tomorrow lo']], ['This week', ['Midweek']], ['Later', ['Far']], ['No date', ['Someday']],
  ]);
  expect([g.open, g.overdue, g.urgent]).toEqual([7, 1, 2]);
});

test('filtering by type, and completed items listed separately', () => {
  const items = [it({ type: 'assignment', title: 'A', date: '2026-10-12' }), it({ type: 'todo', title: 'B' }), it({ type: 'todo', title: 'Old', done: true })];
  expect(taskGroups(items, 'todo', s, NOW).groups.flatMap(([, l]) => l.map((e) => e.it.title))).toEqual(['B']);
  expect(taskGroups(items, 'all', s, NOW).done.map((e) => e.it.title)).toEqual(['Old']);
  expect(taskGroups(items, 'event', s, NOW).groups).toEqual([]);
});

test('a repeating task shows at its next occurrence that is not ticked', () => {
  const r = it({ type: 'assignment', title: 'Daily', date: '2026-10-08', repeat: 'daily', doneOn: ['2026-10-10'] });
  expect(nextOcc(r, new Date(NOW))).toBe('2026-10-11');
  expect(nextOcc(it({ type: 'todo' }), new Date(NOW))).toBeNull();
});

test('due times: the item\'s time, the usual due time, or midnight for an untimed event', () => {
  expect(new Date(dueAt(it({ type: 'assignment' }), '2026-10-12', s)).getHours()).toBe(23);
  expect(new Date(dueAt(it({ type: 'event' }), '2026-10-12', s)).getHours()).toBe(0);
  expect(new Date(dueAt(it({ type: 'todo', time: '07:30' }), '2026-10-12', s)).getMinutes()).toBe(30);
});

test('relative wording and tone', () => {
  expect(rel(NOW + 3 * 86400000, NOW)).toEqual(['in 3 days', 'ok']);
  expect(rel(NOW + 10 * 3600000, NOW)).toEqual(['in 10 h', 'soon']);
  expect(rel(NOW - 86400000, NOW)).toEqual(['1 day overdue', 'late']);
  expect(rel(NOW - 20 * 60000, NOW)).toEqual(['20 min overdue', 'late']);
});

test('history lists ticked items and past events, newest first, repeats per day', () => {
  const items = [
    it({ type: 'assignment', title: 'Early', date: '2026-10-09', time: '23:59', done: true, doneAt: new Date(2026, 9, 9, 20, 0).getTime() }),
    it({ type: 'assignment', title: 'Late', date: '2026-10-08', time: '12:00', done: true, doneAt: new Date(2026, 9, 9, 8, 0).getTime() }),
    it({ type: 'event', title: 'Lecture', date: '2026-10-09', time: '10:00', endTime: '12:00' }),
    it({ type: 'event', title: 'Tomorrow', date: '2026-10-11', time: '10:00' }),
    it({ type: 'event', title: 'Gym', date: '2026-10-08', time: '07:00', repeat: 'daily' }),
    it({ type: 'assignment', title: 'Series', date: '2026-10-07', repeat: 'daily', doneOn: ['2026-10-08'] }),
    it({ type: 'assignment', title: 'Open', date: '2026-10-09' }),
  ];
  const rows = historyRows(items, s, NOW);
  const titles = rows.map((r) => r.it.title);
  expect(titles).not.toContain('Open');
  expect(titles).not.toContain('Tomorrow');
  expect(titles.filter((t) => t === 'Gym')).toHaveLength(3); // 8th, 9th and this morning's session (it has ended by 12:00)
  expect(rows.map((r) => r.when)).toEqual([...rows.map((r) => r.when)].sort((a, b) => b - a));
  const st = historyStats(rows, s, NOW);
  expect(st).toEqual({ completed: 3, onTime: '50%', events: 4 });
});

test('history group labels', () => {
  expect(groupLabel(NOW, NOW)).toBe('Today');
  expect(groupLabel(NOW - 86400000, NOW)).toBe('Yesterday');
  expect(groupLabel(NOW - 3 * 86400000, NOW)).toBe('Wednesday');
  expect(groupLabel(NOW - 20 * 86400000, NOW)).toBe('September 2026');
  expect(groupLabel(0, NOW)).toBe('Earlier');
});

test('search finds words anywhere, open items before done ones, nearest dates first', () => {
  const items = [
    it({ type: 'assignment', title: 'Robotics report', category: 'Study', date: '2026-12-01' }),
    it({ type: 'event', title: 'Robotics seminar', location: 'Lab 3', date: '2026-10-12' }),
    it({ type: 'todo', title: 'Robotics notes', done: true }),
    it({ type: 'todo', title: 'Groceries' }),
  ];
  expect(search(items, 'robotics', NOW).map((i) => i.title)).toEqual(['Robotics seminar', 'Robotics report', 'Robotics notes']);
  expect(search(items, 'lab 3', NOW).map((i) => i.title)).toEqual(['Robotics seminar']);
  expect(search(items, 'study report', NOW)).toHaveLength(1);
  expect(search(items, '   ', NOW)).toEqual([]);
});
