import * as A from '../lib/actions';
import { emptyData } from '../lib/store';
import type { AppData } from '../lib/types';

const NOW = 1_800_000_000_000;
const base = (): AppData => emptyData();
const withOne = (patch = {}) => { const r = A.addItem(base(), { type: 'assignment', title: 'Essay', date: '2026-10-14', time: '23:59', ...patch }, NOW); return { d: r.data, id: r.item.id }; };

test('add, update, delete into the bin, restore, delete forever', () => {
  const { d, id } = withOne();
  expect(d.items[0]).toMatchObject({ title: 'Essay', createdAt: NOW, updatedAt: NOW });
  const u = A.updateItem(d, id, { title: 'Essay v2' }, NOW + 5);
  expect([u.item!.title, u.item!.updatedAt]).toEqual(['Essay v2', NOW + 5]);
  const rm = A.removeItem(u.data, id, NOW + 10);
  expect([rm.data.items.length, rm.data.trash.length, rm.gone!.deletedAt]).toEqual([0, 1, NOW + 10]);
  const back = A.restoreItem(rm.data, id, NOW + 20);
  expect([back.data.items.length, back.data.trash.length, 'deletedAt' in back.item!]).toEqual([1, 0, false]);
  expect(A.purgeItem(A.removeItem(back.data, id).data, id).trash).toHaveLength(0);
  expect(A.restoreItem(base(), 'nope').item).toBeNull();
});

test('the bin empties itself after 30 days and can be emptied by hand', () => {
  const { d, id } = withOne();
  const gone = A.removeItem(d, id, NOW).data;
  expect(A.dropExpiredBin(gone, NOW + 29 * 86400000).trash).toHaveLength(1);
  expect(A.dropExpiredBin(gone, NOW + 30 * 86400000).trash).toHaveLength(0);
  expect(A.emptyBin(gone).trash).toHaveLength(0);
});

test('deleting a calendar event keeps it from coming back; restoring forgets that', () => {
  const { d, id } = withOne({ source: { feed: 'f1', key: 'uid-1' } });
  const rm = A.removeItem(d, id).data;
  expect(rm.ignored).toContain('f1|uid-1');
  expect(A.restoreItem(rm, id).data.ignored).not.toContain('f1|uid-1');
});

test('ticking a one-off item, a repeating one per day, and un-ticking', () => {
  const one = withOne();
  const t = A.toggleDone(one.d, one.id, '2026-10-14', NOW);
  expect([t.completing, t.data.items[0]!.done, t.data.items[0]!.doneAt]).toEqual([true, true, NOW]);
  expect(A.toggleDone(t.data, one.id, '2026-10-14').data.items[0]!.done).toBe(false);
  const rep = withOne({ repeat: 'daily' });
  const r1 = A.toggleDone(rep.d, rep.id, '2026-10-15').data;
  expect([r1.items[0]!.doneOn, r1.items[0]!.done]).toEqual([['2026-10-15'], false]);
  expect(A.toggleDone(r1, rep.id, '2026-10-15').data.items[0]!.doneOn).toEqual([]);
});

test('steps: ticking the last one says everything is done', () => {
  const { d, id } = withOne({ subtasks: [{ id: 'a', text: 'one', done: true }, { id: 'b', text: 'two', done: false }] });
  const r = A.tickStep(d, id, 'b');
  expect([r.allDone, r.data.items[0]!.subtasks.every((s) => s.done)]).toEqual([true, true]);
  expect(A.tickStep(r.data, id, 'b').allDone).toBe(false);
});

test('notification buttons: Done ticks and clears a snooze; Snooze pauses; both are logged; unknown items are refused', () => {
  const { d, id } = withOne();
  const sn = A.applyAction(d, id, '2026-10-14', 'snooze', 15, NOW);
  expect(sn.data.snoozed[`${id}@2026-10-14`]).toBe(NOW + 15 * 60000);
  expect(sn.data.log[0]).toMatchObject({ title: 'Snoozed: Essay', body: 'Reminders paused for 15 min', kind: 'action' });
  const done = A.applyAction(sn.data, id, '2026-10-14', 'done', 10, NOW + 1);
  expect([done.data.items[0]!.done, done.data.snoozed[`${id}@2026-10-14`]]).toEqual([true, undefined]);
  expect(A.applyAction(done.data, id, '2026-10-14', 'done').data.items[0]!.done).toBe(true); // pressing Done again never un-ticks
  expect(A.applyAction(d, 'nope', '', 'done').ok).toBe(false);
  expect(A.applyAction(d, id, '2026-10-14', 'snooze', 99999, NOW).data.snoozed[`${id}@2026-10-14`]).toBe(NOW + 1440 * 60000); // capped at a day
});

test('"only this one" splits an occurrence out of a series', () => {
  const { d, id } = withOne({ type: 'event', title: 'Gym', date: '2026-10-11', time: '07:00', endTime: '08:00', repeat: 'daily' });
  const r = A.detachOccurrence(d, id, '2026-10-13', { title: 'Gym special', time: '09:00' }, NOW);
  expect(r.original!.skip).toEqual(['2026-10-13']);
  expect(r.created).toMatchObject({ title: 'Gym special', repeat: 'none', date: '2026-10-13', time: '09:00', attachments: [] });
  expect(r.data.items).toHaveLength(2);
  expect(A.detachOccurrence(r.data, r.created!.id, '2026-10-13').created).toBeNull(); // not a series
  expect(A.skipOccurrence(d, id, '2026-10-12').items[0]!.skip).toEqual(['2026-10-12']);
});

test('the web export: new items come across, existing ones stay, the profile is only filled in where empty', () => {
  const { d } = withOne();
  d.profile.name = 'Kept name';
  const web = { profile: { name: 'Web name', email: 'v@x.com' }, settings: { categories: [{ name: 'Study', color: '#111' }, { name: 'Robotics', color: '#222' }] },
    items: [{ id: d.items[0]!.id, type: 'todo', title: 'DIFFERENT, must not overwrite' }, { id: 'web-1', type: 'assignment', title: 'From the Mac', category: 'Robotics', date: '2026-10-20' }] };
  const r = A.importWebExport(d, web);
  expect(r.added).toBe(1);
  expect(r.data.items.map((i) => i.title)).toEqual(['Essay', 'From the Mac']);
  expect(r.data.profile).toMatchObject({ name: 'Kept name', email: 'v@x.com' });
  expect(r.data.settings.categories.map((c) => c.name)).toContain('Robotics');
});

test('notes are stamped when saved', () => {
  expect(A.setNotepad(base(), 'hello', NOW).notepad).toEqual({ text: 'hello', at: new Date(NOW).toISOString() });
});
