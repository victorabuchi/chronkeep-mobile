import { newItem } from '../lib/items';
import { createStore, dayStamp, emptyData, normalize } from '../lib/store';
import { memFs } from './memfs';

const ROOT = '/doc/chronkeep/';
const withItem = (title: string) => { const d = emptyData(); d.items.push(newItem({ title })); return d; };

test('saves and loads back', async () => {
  const fs = memFs(), s = createStore(fs, ROOT);
  await s.save(withItem('Keep me'));
  expect((await s.load()).data.items.map((i) => i.title)).toEqual(['Keep me']);
  expect(fs.files.has(ROOT + 'data.json.tmp')).toBe(false); // no temp file left behind
});

test('a first run is empty with the web defaults', async () => {
  const { data } = await createStore(memFs(), ROOT).load();
  expect([data.items.length, data.settings.accent, data.settings.categories.map((c) => c.name)]).toEqual([0, '#3b5bdb', ['Study', 'Work', 'Personal', 'Health']]);
});

test('closed in the middle of a save: the new data is not lost', async () => {
  const fs = memFs(), s = createStore(fs, ROOT);
  await s.save(withItem('Old'));
  fs.failNextMove = true; // the old file is gone, the new one is still the temp file
  await expect(s.save(withItem('New'))).rejects.toThrow();
  const loaded = await s.load();
  expect([loaded.data.items[0]!.title, loaded.recoveredFrom]).toEqual(['New', 'data.json.tmp']);
});

test('a damaged file is kept aside and the newest backup is used', async () => {
  const fs = memFs(), s = createStore(fs, ROOT);
  await s.save(withItem('Survivor'));
  await s.backupNow('manual-1');
  fs.files.set(ROOT + 'data.json', '{"items": [{"title": "cut in ha'); // damaged
  const loaded = await s.load();
  expect(loaded.data.items[0]!.title).toBe('Survivor');
  expect(loaded.recoveredFrom).toBe('data-manual-1.json');
  expect([...fs.files.keys()].some((k) => k.includes('data.corrupt-'))).toBe(true);
});

test('damaged and no backup: starts empty but keeps the damaged copy', async () => {
  const fs = memFs(); fs.files.set(ROOT + 'data.json', 'not json');
  const loaded = await createStore(fs, ROOT).load();
  expect([loaded.data.items.length, !!loaded.keptAs]).toEqual([0, true]);
});

test('one backup a day, restorable, and odd names refused', async () => {
  const fs = memFs(), s = createStore(fs, ROOT);
  await s.save(withItem('A'));
  expect(await s.dailyBackup()).toBe(`data-${dayStamp()}.json`);
  expect(await s.dailyBackup()).toBeNull();
  expect((await s.readBackup(`data-${dayStamp()}.json`))!.items[0]!.title).toBe('A');
  expect(await s.readBackup('../../etc/passwd')).toBeNull();
  expect(await s.readBackup('nope')).toBeNull();
});

test('old backups are pruned: 14 days kept, labelled ones capped', async () => {
  const fs = memFs(), s = createStore(fs, ROOT);
  await s.save(withItem('A'));
  for (let i = 1; i <= 20; i++) fs.files.set(`${ROOT}backups/data-2026-09-${String(i).padStart(2, '0')}.json`, '{}');
  for (let i = 1; i <= 25; i++) fs.files.set(`${ROOT}backups/data-manual-${1700000000000 + i}.json`, '{}');
  await s.backupNow('pre-restore-1');
  const names = (await s.listBackups()).map((b) => b.name);
  expect(names.filter((n) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(n))).toHaveLength(14);
  expect(names.filter((n) => !/^data-\d{4}-\d{2}-\d{2}\.json$/.test(n))).toHaveLength(20);
});

test('reads the web app\'s export: items, profile and settings come across, server-only settings do not', () => {
  const web = {
    settings: { name: 'ChronKeep', accent: '#e11d48', ntfyTopic: 'secret', notifyMac: true, categories: [{ name: 'Study', color: '#7c5cf0' }], reminderDefaults: { assignment: [60] } },
    profile: { name: 'Victor', email: 'v@x.com', phone: '', photo: '' },
    items: [{ id: 'a', type: 'assignment', title: 'Essay', date: '2026-10-12', time: '23:59', remind: 30, done: false }],
    notepad: { html: '<div>old html note</div>', at: null }, security: { pin: 'x' },
  };
  const d = normalize(web);
  expect(d.settings.accent).toBe('#e11d48');
  expect((d.settings as any).ntfyTopic).toBeUndefined();
  expect(d.settings.reminderDefaults).toEqual({ assignment: [60], event: [10], todo: [0] });
  expect(d.items[0]).toMatchObject({ id: 'a', reminders: [30], subtasks: [], priority: '', nudges: [], attachments: [] });
  expect(d.profile.name).toBe('Victor');
  expect(d.notepad.text).toBe(''); // the web's note is HTML; the phone's is text, so it is converted separately
});

test('junk never throws', () => {
  for (const x of [null, undefined, 5, 'x', [], { items: 'no' }, { settings: null }]) expect(() => normalize(x)).not.toThrow();
});
