import { newItem } from '../lib/items';
import { emptyData } from '../lib/store';
import { hash, htmlToText, itemFp, pending, receive, textToHtml, type Reply } from '../lib/sync';
import type { AppData, Item } from '../lib/types';

const noReply = (cursor = 0): Reply => ({ cursor, items: [], trash: [], tombstones: [], parts: {} });
// one round trip with an empty answer: what was sent counts as synced
const settle = (d: AppData, now: number) => { const p = pending(d, now); return { p, d: receive(p.data, p.sent, noReply(1)) }; };

describe('fingerprints and the note', () => {
  test('hash is stable and sensitive', () => {
    expect(hash('abc')).toBe(hash('abc'));
    expect(hash('abc')).not.toBe(hash('abd'));
  });
  test('an item fingerprint ignores updatedAt and the order of keys', () => {
    const a = newItem({ title: 'x' }), b = { ...Object.fromEntries(Object.entries(a).reverse()), updatedAt: 99 } as Item;
    expect(itemFp(a)).toBe(itemFp(b));
  });
  test('the note goes to HTML and back, keeping checklists', () => {
    const t = 'Plan\n☐ read\n☑ write\n\nend <b>';
    expect(htmlToText(textToHtml(t))).toBe(t);
    expect(htmlToText('<ul class="checklist"><li data-checked="true">done</li><li data-checked="false">todo</li></ul>')).toBe('☑ done\n☐ todo');
    expect(htmlToText('plain text')).toBe('plain text');
  });
});

describe('what the phone sends', () => {
  test('the very first sync keeps item times and sends settings as older than the cloud', () => {
    const d = emptyData(); d.items = [newItem({ id: 'a', title: 'One', updatedAt: 500 })];
    const p = pending(d, 9000);
    expect(p.changes.items.map((i) => [i.id, i.updatedAt])).toEqual([['a', 500]]);
    expect(p.changes.parts.settings?.updatedAt).toBe(0);
  });
  test('after that, only changed items go, stamped with now', () => {
    let d = emptyData(); d.items = [newItem({ id: 'a', title: 'One', updatedAt: 500 }), newItem({ id: 'b', title: 'Two', updatedAt: 500 })];
    d = settle(d, 1000).d;
    expect(pending(d, 2000).empty).toBe(true);
    d = { ...d, items: d.items.map((i) => (i.id === 'a' ? { ...i, title: 'One!' } : i)) };
    const p = pending(d, 3000);
    expect(p.changes.items.map((i) => [i.id, i.updatedAt])).toEqual([['a', 3000]]);
  });
  test('deleting for good is a tombstone, moving to the bin is not', () => {
    let d = emptyData(); d.items = [newItem({ id: 'a', updatedAt: 1 }), newItem({ id: 'b', updatedAt: 1 })];
    d = settle(d, 1000).d;
    const [a, ...rest] = d.items;
    d = { ...d, items: rest, trash: [{ ...a!, deletedAt: 1500 }] };
    expect(pending(d, 2000).changes.tombstones).toEqual([]);
    d = settle(d, 2000).d;
    d = { ...d, trash: [], items: [] };
    expect(pending(d, 3000).changes.tombstones.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });
  test('files that only exist on the phone are left out', () => {
    const d = emptyData(); d.items = [newItem({ id: 'a', updatedAt: 1, attachments: [{ id: 'x', name: 'a', size: 1, type: 't', addedAt: 1, local: true }, { id: 'y', name: 'b', size: 1, type: 't', addedAt: 1 }] })];
    expect(pending(d, 5).changes.items[0]!.attachments.map((a) => a.id)).toEqual(['y']);
  });
});

describe('what the cloud answers', () => {
  const server = (o: Partial<Item> & { id: string }): Item => newItem({ updatedAt: 5000, ...o });
  test('takes newer items, keeps newer local ones, and moves things to the bin', () => {
    let d = emptyData(); d.items = [newItem({ id: 'a', title: 'Local', updatedAt: 9000 }), newItem({ id: 'b', title: 'Old', updatedAt: 1000 })];
    d = settle(d, 9500).d;
    d = receive(d, { items: {}, tombs: [], parts: {} }, { ...noReply(2), items: [server({ id: 'a', title: 'Cloud A' }), server({ id: 'b', title: 'Cloud B' }), server({ id: 'c', title: 'New' })] });
    expect(Object.fromEntries(d.items.map((i) => [i.id, i.title]))).toEqual({ a: 'Local', b: 'Cloud B', c: 'New' });
    d = receive(d, { items: {}, tombs: [], parts: {} }, { ...noReply(3), trash: [{ ...server({ id: 'c', updatedAt: 7000 }), deletedAt: 7000 }] });
    expect(d.items.map((i) => i.id).sort()).toEqual(['a', 'b']); expect(d.trash.map((i) => i.id)).toEqual(['c']);
  });
  test('removes what was deleted elsewhere, unless it was edited here later', () => {
    let d = emptyData(); d.items = [newItem({ id: 'a', updatedAt: 1000 }), newItem({ id: 'b', updatedAt: 9000 })];
    d = receive(d, { items: {}, tombs: [], parts: {} }, { ...noReply(2), tombstones: [{ id: 'a', at: 5000 }, { id: 'b', at: 5000 }] });
    expect(d.items.map((i) => i.id)).toEqual(['b']);
  });
  test('an item from a calendar is not duplicated when the cloud already has it under another id', () => {
    let d = emptyData(); d.items = [newItem({ id: 'local', source: { feed: 'f', key: 'k' }, updatedAt: 1 })];
    d = receive(d, { items: {}, tombs: [], parts: {} }, { ...noReply(2), items: [server({ id: 'cloud', source: { feed: 'f', key: 'k' } })] });
    expect(d.items.map((i) => i.id)).toEqual(['cloud']);
  });
  test('settings, note and profile come across; device-only settings stay', () => {
    let d = emptyData(); d.settings = { ...d.settings, notify: false };
    d = settle(d, 1).d;
    d = receive(d, { items: {}, tombs: [], parts: {} }, { ...noReply(2), parts: { settings: { value: { accent: '#112233', notify: true }, updatedAt: 5 }, notepad: { value: { html: '<div>hi</div><div>☐ x</div>', at: 'now' }, updatedAt: 5 }, profile: { value: { name: 'Vic' }, updatedAt: 5 } } });
    expect(d.settings.accent).toBe('#112233'); expect(d.settings.notify).toBe(false);
    expect(d.notepad.text).toBe('hi\n☐ x'); expect(d.profile.name).toBe('Vic');
    expect(pending(d, 99).empty).toBe(true); // what came from the cloud is not sent back
  });
  test('a change made while the request was in flight is kept and sent next time', () => {
    let d = emptyData(); d.items = [newItem({ id: 'a', title: 'v1', updatedAt: 1 })];
    d = settle(d, 10).d;
    d = { ...d, items: [{ ...d.items[0]!, title: 'v2' }] };
    const p = pending(d, 100); // sent v2
    const during = { ...p.data, items: [{ ...p.data.items[0]!, title: 'v3' }] };
    const after = receive(during, p.sent, { ...noReply(5), items: [{ ...p.data.items[0]!, title: 'v2' }] });
    expect(after.items[0]!.title).toBe('v3'); expect(pending(after, 200).changes.items.map((i) => i.title)).toEqual(['v3']);
  });
});

// The same rounds against the real server code, when the web project sits next to this one.
let srv: any = null;
// (jest leaves the web project's plain CommonJS untransformed: see transformIgnorePatterns in package.json)
let model: any = null;
try { srv = require('../../chronkeep/lib/sync'); model = require('../../chronkeep/lib/model'); } catch (e) { console.log('contract tests skipped:', (e as Error).message.slice(0, 200)); }
(srv ? describe : describe.skip)('phone and server agree (contract)', () => {
  const server = () => srv.stamp(model.defaults(), 1000);
  const round = (doc: any, d: AppData, now: number) => {
    const p = pending(d, now);
    const since = d.sync.cursor;
    srv.applyChanges(doc, p.changes, now); srv.stamp(doc, now);
    return receive(p.data, p.sent, srv.changesSince(doc, since));
  };
  test('two phones and the web converge, including deletions and the bin', () => {
    const doc = server();
    let a = emptyData(), b = emptyData();
    a.items = [newItem({ id: 'x', title: 'From A', updatedAt: 2000 })];
    a = round(doc, a, 3000); b = round(doc, b, 3500);
    expect(b.items.map((i) => i.title)).toEqual(['From A']);
    b = { ...b, items: b.items.map((i) => ({ ...i, title: 'Edited on B' })) };
    b = round(doc, b, 4000); a = round(doc, a, 4500);
    expect(a.items[0]!.title).toBe('Edited on B');
    // the web (server side) moves it to the bin and deletes another for good
    const web = doc.items.splice(0, 1)[0]; doc.trash.push({ ...web, deletedAt: 5000 }); srv.stamp(doc, 5000);
    a = round(doc, a, 5500); b = round(doc, b, 5600);
    expect([a.items.length, a.trash.length, b.items.length, b.trash.length]).toEqual([0, 1, 0, 1]);
    a = { ...a, trash: [] }; a = round(doc, a, 6000); b = round(doc, b, 6500);
    expect(b.trash.length).toBe(0); expect(doc.trash.length).toBe(0);
    expect(pending(a, 7000).empty).toBe(true); expect(pending(b, 7000).empty).toBe(true);
  });
  test('a new phone signing in takes the cloud settings instead of overwriting them', () => {
    const doc = server(); doc.settings.accent = '#ff0000'; srv.stamp(doc, 2000);
    let phone = emptyData(); phone = round(doc, phone, 3000);
    expect(phone.settings.accent).toBe('#ff0000'); expect(doc.settings.accent).toBe('#ff0000');
  });
});
