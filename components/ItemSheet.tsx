import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as commands from '../lib/commands';
import { useData } from '../lib/data';
import { fmtDay } from '../lib/dates';
import { openFile, pickFiles, removeFile, storeFile, bytes, MAX_FILES, type Picked } from '../lib/files';
import { shortId } from '../lib/ids';
import { addDays, day, toMin, ymd } from '../lib/recur';
import { isRepeat } from '../lib/recur';
import { useTheme } from '../lib/theme-context';
import { closeItem, useUI, type SheetState } from '../lib/ui-state';
import type { Attachment, Item, ItemType, Nudge, Priority, Repeat, Subtask } from '../lib/types';
import { DateField, TimeField } from './forms';
import I from './Icon';
import NudgeEditor, { REM } from './NudgeEditor';
import Tick from './Tick';
import { Btn, Chip, Field, IBtn, Input, Note, Segment, Select, Sheet, Txt, useToast } from './ui';

const TYPES: Array<{ id: ItemType; label: string }> = [{ id: 'assignment', label: 'Assignment' }, { id: 'event', label: 'Event' }, { id: 'todo', label: 'To-do' }];
const PRIOS: Array<{ id: Priority; label: string }> = [{ id: '', label: 'None' }, { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }];
const REPEATS = [{ id: 'none', label: 'Never' }, { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }];

export default function ItemSheet() {
  const sheet = useUI((u) => u.sheet);
  const [last, setLast] = useState<{ sheet: NonNullable<SheetState>; n: number } | null>(null);
  // Each opening gets a fresh form; it stays mounted while the sheet slides away.
  useEffect(() => { if (sheet) setLast((l) => ({ sheet, n: (l?.n ?? 0) + 1 })); }, [sheet]);
  return last ? <Form key={last.n} sheet={last.sheet} open={!!sheet} /> : null;
}

function Form({ sheet, open }: { sheet: NonNullable<SheetState>; open: boolean }) {
  const { c } = useTheme();
  const toast = useToast();
  const s = useData((d) => d.settings), feeds = useData((d) => d.feeds);
  const it = sheet.item, preset = sheet.preset ?? {}, occ = it && isRepeat(it) ? sheet.occ ?? null : null;

  const [type, setType] = useState<ItemType>(it?.type ?? preset.type ?? 'assignment');
  const [scope, setScope] = useState<'all' | 'this'>('all');
  const [title, setTitle] = useState(it?.title ?? '');
  const [category, setCategory] = useState(it?.category ?? preset.category ?? '');
  // Under Study, say which subject it is for; subjects used before are offered as chips.
  const [subject, setSubject] = useState(it?.subject ?? '');
  const items = useData((d) => d.items), study = category.trim().toLowerCase() === 'study';
  const usedSubjects = [...new Set(items.filter((x) => (x.category || '').toLowerCase() === 'study' && x.subject).map((x) => x.subject!))].sort((p, q) => p.localeCompare(q));
  const [date, setDate] = useState(it ? it.date : preset.date ?? ymd(new Date()));
  const [time, setTime] = useState(it ? it.time : preset.time ?? (type === 'assignment' ? s.dueTime : ''));
  const [endTime, setEndTime] = useState(it?.endTime ?? preset.endTime ?? '');
  const [endDate, setEndDate] = useState(it?.endDate ?? '');
  const [location, setLocation] = useState(it?.location ?? '');
  const [priority, setPriority] = useState<Priority>(it?.priority ?? '');
  const [subs, setSubs] = useState<Subtask[]>((it?.subtasks ?? []).map((x) => ({ ...x })));
  const [newStep, setNewStep] = useState('');
  const [rem, setRem] = useState<number[]>(it ? [...it.reminders] : [...(s.reminderDefaults[type] ?? [])]);
  const [nud, setNud] = useState<Nudge[]>(it ? it.nudges.map((r) => ({ ...r })) : (s.nudgeDefaults[type] ?? []).map((r) => ({ ...r })));
  const [touched, setTouched] = useState(!!it);
  const [repeat, setRepeat] = useState<Repeat>(it?.repeat ?? 'none');
  const [until, setUntil] = useState(it?.repeatUntil ?? '');
  const [notes, setNotes] = useState(it?.notes ?? '');
  const [have, setHave] = useState<Attachment[]>(it?.attachments ?? []);
  const [pending, setPending] = useState<Picked[]>([]);
  const [fileMsg, setFileMsg] = useState('');
  const [err, setErr] = useState('');

  const pickType = (t: ItemType) => {
    setType(t);
    if (!touched) { setRem([...(s.reminderDefaults[t] ?? [])]); setNud((s.nudgeDefaults[t] ?? []).map((r) => ({ ...r }))); }
    if (t === 'assignment' && !time && !it) setTime(s.dueTime);
  };
  const pickScope = (v: 'all' | 'this') => { setScope(v); if (occ && it) setDate(v === 'this' ? occ : it.date); };
  const feed = it?.source ? feeds.find((f) => f.id === it.source!.feed) : null;
  const ev = type === 'event', one = !!occ && scope === 'this';

  const save = async () => {
    if (!title.trim()) { setErr('Give it a title.'); return; }
    const t = type === 'assignment' && date && !time ? s.dueTime : time;
    const body: Partial<Item> = { type, title: title.trim(), category, subject: study ? subject.trim() : '', date, time: t, endTime: ev ? endTime : '', endDate: ev ? endDate : '', location: ev ? location.trim() : '', reminders: [...rem].sort((a, b) => b - a), nudges: nud.map((r) => ({ ...r })), repeat, repeatUntil: repeat === 'none' ? '' : until, notes, priority: ev ? '' : priority, subtasks: ev ? [] : subs.filter((x) => x.text.trim()).map((x) => ({ id: x.id, text: x.text.trim(), done: !!x.done })) };
    if (body.endDate && body.date && body.endDate <= body.date) body.endDate = '';
    // An end time earlier than the start means it ends the next day.
    if (ev && body.time && body.endTime && !body.endDate && body.date && toMin(body.endTime) <= toMin(body.time)) body.endDate = ymd(addDays(day(body.date), 1));
    closeItem();
    if (it && occ && one) {
      const { repeat: _r, repeatUntil: _u, ...patch } = body; void _r; void _u;
      const before = { skip: it.skip ?? [], doneOn: it.doneOn };
      const r = commands.detachOccurrence(it.id, occ, patch);
      if (r.created) toast.show(`Changed only ${fmtDay(occ)}`, { action: 'Undo', onAction: () => { commands.purgeItem(r.created!.id); commands.updateItem(it.id, before); } });
      return;
    }
    const target = it ? commands.updateItem(it.id, body) : commands.addItem(body);
    if (!target) return;
    if (!it && target.date) (await import('../lib/ui-state')).setUI({ cur: target.date });
    if (pending.length) {
      const made: Attachment[] = [];
      for (const f of pending) made.push(await storeFile(target.id, f));
      commands.updateItem(target.id, { attachments: [...(target.attachments ?? []), ...made] });
    }
  };

  const del = () => {
    if (!it) return;
    closeItem();
    if (occ && one) {
      const before = it.skip ?? [];
      commands.skipOccurrence(it.id, occ);
      toast.show(`Removed ${fmtDay(occ)} from "${it.title}"`, { action: 'Undo', onAction: () => commands.updateItem(it.id, { skip: before }) });
      return;
    }
    commands.removeItem(it.id);
    toast.show(`Moved "${it.title}" to the bin`, { action: 'Undo', onAction: () => commands.restoreItem(it.id) });
  };

  const addFiles = async () => {
    const { files, skipped } = await pickFiles();
    const room = MAX_FILES - have.length - pending.length;
    if (skipped.length) setFileMsg(skipped[0]!);
    if (files.length > room) setFileMsg(`Up to ${MAX_FILES} files per item.`);
    const take = files.slice(0, Math.max(0, room));
    if (!take.length) return;
    if (it) {
      const made: Attachment[] = [];
      for (const f of take) made.push(await storeFile(it.id, f));
      const next = [...have, ...made];
      setHave(next); commands.updateItem(it.id, { attachments: next });
    } else setPending((p) => [...p, ...take]);
  };
  const dropFile = async (a: Attachment) => { if (!it) return; await removeFile(it.id, a.id); const next = have.filter((x) => x.id !== a.id); setHave(next); commands.updateItem(it.id, { attachments: next }); };

  const lbl = { date: type === 'assignment' ? 'Due date' : ev ? 'Date' : 'Date (optional)', time: type === 'assignment' ? 'Due time' : ev ? 'Start time' : 'Time (optional)' };
  return (
    <Sheet open={open} onClose={closeItem} tall title={it ? 'Edit' : 'New'}
      footer={<>{it ? <Btn variant="danger" onPress={del}>{occ ? (one ? 'Delete this one' : 'Delete series') : 'Delete'}</Btn> : null}<View style={{ flex: 1 }} /><Btn variant="ghost" onPress={closeItem}>Cancel</Btn><Btn onPress={save}>Save</Btn></>}>
      <View style={{ gap: 12 }}>
        <Segment options={TYPES} value={type} onChange={pickType} wide />
        {occ ? <Segment options={[{ id: 'all', label: 'Whole series' }, { id: 'this', label: 'Only this one' }]} value={scope} onChange={pickScope} wide /> : null}
        {occ && one ? <Note>Changes apply only to the occurrence on {fmtDay(occ)}. The rest of the series stays as it is.</Note> : null}
        <Field label="Title"><Input value={title} onChangeText={(v) => { setTitle(v); setErr(''); }} placeholder="e.g. Web Programming essay" autoFocus={!it} />{err ? <Txt style={{ color: c.neg, fontSize: 12, marginTop: 4 }}>{err}</Txt> : null}</Field>
        <Field label="Course"><Select label="Course" value={category} onChange={setCategory} options={[{ id: '', label: 'None' }, ...s.categories.map((x) => ({ id: x.name, label: x.name }))]} /></Field>
        {study ? (
          <Field label="Subject">
            <Input value={subject} onChangeText={setSubject} placeholder="Which subject? e.g. Web Programming" maxLength={60} autoCorrect={false} />
            {usedSubjects.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{usedSubjects.map((n) => <Chip key={n} on={n === subject.trim()} onPress={() => setSubject(n === subject.trim() ? '' : n)}>{n}</Chip>)}</View> : null}
          </Field>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Field label={lbl.date}><DateField value={date} onChange={setDate} clearable={type === 'todo'} /></Field></View>
          <View style={{ flex: 1 }}><Field label={lbl.time}><TimeField value={time} onChange={setTime} clearable /></Field></View>
        </View>
        {ev ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Field label="End time"><TimeField value={endTime} onChange={setEndTime} clearable /></Field></View>
              <View style={{ flex: 1 }}><Field label="Ends on (long events)"><DateField value={endDate} onChange={setEndDate} clearable /></Field></View>
            </View>
            <Field label="Location"><Input value={location} onChangeText={setLocation} placeholder="Room, building or link" maxLength={200} /></Field>
          </>
        ) : null}
        {feed || it?.source ? <Note>From a calendar{feed ? `: ${feed.name}` : ''}. When that calendar changes, it overwrites the title, time and place here. Your reminders and course stay as you set them.</Note> : null}
        {!ev ? <Field label="Priority"><Segment options={PRIOS} value={priority} onChange={setPriority} wide /></Field> : null}
        {!ev ? (
          <Field label="Steps">
            <View style={{ gap: 6 }}>
              {subs.map((x, i) => (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Tick done={x.done} size={15} burst={false} label="Tick step" onPress={() => setSubs(subs.map((y, j) => (j === i ? { ...y, done: !y.done } : y)))} />
                  <View style={{ flex: 1 }}><Input value={x.text} maxLength={120} onChangeText={(v) => setSubs(subs.map((y, j) => (j === i ? { ...y, text: v } : y)))} /></View>
                  <IBtn icon="x" size={13} label="Remove step" onPress={() => setSubs(subs.filter((_, j) => j !== i))} />
                </View>
              ))}
              <Input value={newStep} onChangeText={setNewStep} maxLength={120} placeholder="Add a step, press return" returnKeyType="done" blurOnSubmit={false} onSubmitEditing={() => { const t = newStep.trim(); if (t) { setSubs([...subs, { id: shortId(), text: t, done: false }]); setNewStep(''); } }} />
            </View>
          </Field>
        ) : null}
        <Field label="Remind me once">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {REM.map(([m, l]) => <Chip key={m} on={rem.includes(m)} onPress={() => { setTouched(true); setRem(rem.includes(m) ? rem.filter((x) => x !== m) : [...rem, m]); }}>{l}</Chip>)}
          </View>
        </Field>
        <Field label="Keep reminding me until it is done"><NudgeEditor rules={nud} onChange={(r) => { setTouched(true); setNud(r); }} /></Field>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!one ? <View style={{ flex: 1 }}><Field label="Repeat"><Select label="Repeat" value={repeat} onChange={(v) => setRepeat(v as Repeat)} options={REPEATS} /></Field></View> : null}
          {!one && repeat !== 'none' ? <View style={{ flex: 1 }}><Field label="Repeat until (optional)"><DateField value={until} onChange={setUntil} clearable /></Field></View> : null}
        </View>
        <Field label="Notes"><Input value={notes} onChangeText={setNotes} multiline style={{ minHeight: 64, textAlignVertical: 'top' }} /></Field>
        <Field label="Files">
          <View style={{ gap: 6 }}>
            {have.map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <I d="clip" size={13} color={c.muted} />
                <Pressable style={{ flex: 1 }} onPress={() => it && openFile(it.id, a)}><Txt numberOfLines={1} style={{ color: c.b, fontWeight: '600' }}>{a.name}</Txt></Pressable>
                <Txt style={{ fontSize: 11.5, color: c.muted }}>{bytes(a.size)}</Txt>
                <IBtn icon="x" size={13} label="Remove file" onPress={() => dropFile(a)} />
              </View>
            ))}
            {pending.map((f, i) => (
              <View key={f.uri} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <I d="clip" size={13} color={c.muted} />
                <Txt numberOfLines={1} style={{ flex: 1 }}>{f.name}</Txt>
                <Txt style={{ fontSize: 11.5, color: c.muted }}>{bytes(f.size)}, saved with the item</Txt>
                <IBtn icon="x" size={13} label="Remove file" onPress={() => setPending(pending.filter((_, j) => j !== i))} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Btn variant="ghost" small onPress={addFiles}>Add a file</Btn>
              {fileMsg ? <Txt style={{ color: c.neg, fontSize: 12, flex: 1 }}>{fileMsg}</Txt> : null}
            </View>
          </View>
        </Field>
      </View>
    </Sheet>
  );
}
