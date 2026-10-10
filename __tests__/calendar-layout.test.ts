process.env.TZ = 'Europe/Helsinki';
import { daysFor, eyebrow, lanes, monthWeeks, step, title } from '../lib/calendar-layout';
import { defaultSettings } from '../lib/defaults';

const s = defaultSettings();

test('views show 3 days from the current one, one day, or leave a month to its own grid', () => {
  expect(daysFor('3days', '2026-10-30', s)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  expect(daysFor('day', '2026-10-10', s)).toEqual(['2026-10-10']);
  expect(daysFor('month', '2026-10-10', s)).toEqual([]);
});

test('a month starts on the week-start day and has just the weeks it needs', () => {
  const w = monthWeeks('2026-10-10', s); // October 2026 starts on a Thursday
  expect(w).toHaveLength(5);
  expect(w[0]![0]).toBe('2026-09-28'); // Monday
  expect(w[0]![3]).toBe('2026-10-01');
  expect(w[4]![6]).toBe('2026-11-01');
  expect(monthWeeks('2026-10-10', { ...s, weekStart: 0 })[0]![0]).toBe('2026-09-27'); // Sunday start
  expect(monthWeeks('2027-02-10', s)).toHaveLength(4); // February 2027 starts on a Monday and fits 4 weeks exactly
});

test('titles are written with "to", like the web', () => {
  expect(title('3days', ['2026-10-10', '2026-10-11', '2026-10-12'], '2026-10-10')).toBe('October 10 to 12, 2026');
  expect(title('3days', ['2026-10-30', '2026-10-31', '2026-11-01'], '2026-10-30')).toBe('Oct 30 to Nov 1, 2026');
  expect(title('day', ['2026-10-10'], '2026-10-10')).toBe('Saturday, October 10, 2026');
  expect(title('month', [], '2026-10-10')).toBe('October 2026');
  expect([eyebrow('3days'), eyebrow('day'), eyebrow('month')]).toEqual(['3 days', 'Day', 'Month']);
});

test('previous and next move by the view', () => {
  expect(step('3days', '2026-10-10', 1)).toBe('2026-10-13');
  expect(step('3days', '2026-10-10', -1)).toBe('2026-10-07');
  expect(step('day', '2026-10-31', 1)).toBe('2026-11-01');
  expect(step('month', '2026-10-10', 1)).toBe('2026-11-01');
  expect(step('month', '2026-01-15', -1)).toBe('2025-12-01');
});

test('overlapping events share the width in lanes; separate ones do not', () => {
  const l = lanes([{ id: 'a', s: 600, e: 720 }, { id: 'b', s: 660, e: 780 }, { id: 'c', s: 700, e: 760 }, { id: 'd', s: 900, e: 960 }]);
  expect(l.map((x) => [x.id, x.lane, x.n])).toEqual([['a', 0, 3], ['b', 1, 3], ['c', 2, 3], ['d', 0, 1]]);
  expect(lanes([{ s: 600, e: 660 }, { s: 660, e: 720 }]).map((x) => [x.lane, x.n])).toEqual([[0, 1], [0, 1]]); // back to back: no overlap
});
