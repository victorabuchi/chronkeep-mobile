import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import ColorField from '../../components/ColorField';
import { TimeField } from '../../components/forms';
import NudgeEditor, { REM } from '../../components/NudgeEditor';
import Screen from '../../components/Screen';
import { Btn, Card, CardTitle, Chip, Check, Field, IBtn, Input, Note, PageHead, Select, Txt, useToast } from '../../components/ui';
import * as commands from '../../lib/commands';
import { useData } from '../../lib/data';
import { ago } from '../../lib/dates';
import { askPermission, notifyState, sendTest, type NotifyState } from '../../lib/notify';
import { shareText } from '../../lib/share';
import type { Nudge, Settings } from '../../lib/types';
import { useTheme } from '../../lib/theme-context';

const ACCENT = '#3b5bdb';
const syncText = (r: { created: number; updated: number; removed: number }) => (r.created || r.updated || r.removed ? `${r.created} added, ${r.updated} updated, ${r.removed} removed` : 'Already up to date');
const num = (v: string, fallback: number) => (v.trim() === '' || Number.isNaN(+v) ? fallback : Math.trunc(+v));

function Card2({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card style={{ gap: 12, padding: 14 }}><CardTitle>{title}</CardTitle>{children}</Card>;
}

export default function Customize() {
  const { c } = useTheme();
  const toast = useToast();
  const saved = useData((d) => d.settings), feeds = useData((d) => d.feeds);
  const [S, setS] = useState<Settings>(saved);
  const [msg, setMsg] = useState('');
  const [perm, setPerm] = useState<NotifyState>('off');
  const [fName, setFName] = useState(''), [fUrl, setFUrl] = useState(''), [fCat, setFCat] = useState('Timetable'), [fMsg, setFMsg] = useState(''), [fBusy, setFBusy] = useState(false), [syncing, setSyncing] = useState('');
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((s) => ({ ...s, [k]: v }));
  useEffect(() => { void notifyState().then(setPerm); }, []);
  // Adding a calendar can add a course in the background: take it in unless the courses are being edited here.
  const prevCats = useRef(JSON.stringify(saved.categories));
  useEffect(() => {
    const next = JSON.stringify(saved.categories);
    setS((cur) => (JSON.stringify(cur.categories) === prevCats.current ? { ...cur, categories: saved.categories } : cur));
    prevCats.current = next;
  }, [saved.categories]);

  const dirty = JSON.stringify(S) !== JSON.stringify(saved);
  const save = () => {
    const next: Settings = { ...S, name: S.name.trim() || 'ChronKeep', dayStart: Math.min(S.dayStart, 22), dayEnd: Math.max(S.dayEnd, Math.min(S.dayStart, 22) + 1), dueTime: S.dueTime || '23:59', categories: S.categories.filter((x) => x.name.trim()) };
    commands.setSettings(next); setS(next); setMsg('Saved'); setTimeout(() => setMsg(''), 2500);
  };
  const discard = () => { setS(saved); setMsg('Changes discarded'); setTimeout(() => setMsg(''), 2000); };
  const cats = S.categories;
  const catOptions = [...cats.map((x) => x.name), ...(cats.some((x) => x.name === 'Timetable') ? [] : ['Timetable'])].map((n) => ({ id: n, label: n }));

  const addFeed = async () => {
    setFBusy(true); setFMsg('Adding…');
    try { const r = await commands.addFeed(fName, fUrl, fCat); setFName(''); setFUrl(''); setFMsg(''); toast.show(`${fName.trim()}: ${r.created} event${r.created === 1 ? '' : 's'} added`); } catch (e) { setFMsg((e as Error).message || 'Could not add that.'); }
    setFBusy(false);
  };
  const sync = async (id: string, name: string) => {
    setSyncing(id);
    try { toast.show(`${name}: ${syncText(await commands.syncFeed(id))}`); } catch (e) { toast.show(`${name}: ${(e as Error).message}`, { error: true }); }
    setSyncing('');
  };
  const drop = (id: string, name: string, count: number) => Alert.alert(`Stop following "${name}"?`, count ? `Also remove the ${count} events imported from it?` : undefined, count
    ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Keep events', onPress: () => { commands.removeFeed(id, false); toast.show('Calendar removed, events kept'); } }, { text: 'Remove events', style: 'destructive', onPress: () => { commands.removeFeed(id, true); toast.show('Calendar and its events removed'); } }]
    : [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { commands.removeFeed(id, false); toast.show('Calendar removed'); } }]);
  const importFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/calendar', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0]!;
    try { const res = commands.importIcs(a.name, await FileSystem.readAsStringAsync(a.uri), fCat); toast.show(`${a.name}: ${syncText(res)}`); } catch { setFMsg('Could not import that file.'); }
  };
  const exportIcs = async () => { if (!(await shareText('chronkeep.ics', commands.exportIcs(), 'text/calendar'))) setFMsg('Sharing is not available on this device.'); };

  const enable = async (on: boolean) => {
    if (on && perm !== 'on') { const s = await askPermission(); setPerm(s); if (s !== 'on') { set('notify', false); return; } }
    set('notify', on);
  };
  const remChips = (k: 'assignment' | 'event' | 'todo', label: string) => (
    <Field label={`One-off reminders for new ${label}`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {REM.map(([m, l]) => { const cur = S.reminderDefaults[k]; return <Chip key={m} on={cur.includes(m)} onPress={() => set('reminderDefaults', { ...S.reminderDefaults, [k]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] })}>{l}</Chip>; })}
      </View>
    </Field>
  );
  const nudges = (k: 'assignment' | 'event' | 'todo', label: string) => (
    <Field label={`Repeating reminders for new ${label}`}><NudgeEditor rules={S.nudgeDefaults[k]} onChange={(r: Nudge[]) => set('nudgeDefaults', { ...S.nudgeDefaults, [k]: r })} /></Field>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <PageHead eyebrow="Make it yours" title="Customize" />
        <Card2 title="Appearance">
          <Field label="App name"><Input value={S.name} onChangeText={(v) => set('name', v)} maxLength={40} /></Field>
          <Field label="Accent colour">
            <View style={{ gap: 8 }}><ColorField value={S.accent} onChange={(h) => set('accent', h)} /><View style={{ alignSelf: 'flex-start' }}><Btn variant="ghost" small onPress={() => set('accent', ACCENT)}>Reset to cobalt</Btn></View></View>
          </Field>
          <Field label="Theme"><Select label="Theme" value={S.theme} onChange={(v) => set('theme', v as Settings['theme'])} options={[{ id: 'auto', label: 'Match device' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} /></Field>
        </Card2>
        <Card2 title="Calendar">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Week starts"><Select label="Week starts" value={String(S.weekStart)} onChange={(v) => set('weekStart', +v as 0 | 1)} options={[{ id: '1', label: 'Monday' }, { id: '0', label: 'Sunday' }]} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Show weekends"><Select label="Show weekends" value={S.showWeekends ? '1' : '0'} onChange={(v) => set('showWeekends', v === '1')} options={[{ id: '1', label: 'Saturday and Sunday' }, { id: '0', label: 'Weekdays only' }]} /></Field></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Day starts (hour)"><Input keyboardType="number-pad" value={String(S.dayStart)} onChangeText={(v) => set('dayStart', Math.max(0, Math.min(23, num(v, 0))))} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Day ends (hour)"><Input keyboardType="number-pad" value={String(S.dayEnd)} onChangeText={(v) => set('dayEnd', Math.max(1, Math.min(24, num(v, 1))))} /></Field></View>
          </View>
        </Card2>
        <Card2 title="Courses">
          <Note>Colours your assignments and events by course or category.</Note>
          {cats.map((x, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><Input value={x.name} onChangeText={(v) => set('categories', cats.map((y, j) => (j === i ? { ...y, name: v } : y)))} accessibilityLabel="Course name" /></View>
              <ColorField width={128} value={x.color} onChange={(h) => set('categories', cats.map((y, j) => (j === i ? { ...y, color: h } : y)))} />
              <IBtn icon="x" size={14} label="Remove course" onPress={() => set('categories', cats.filter((_, j) => j !== i))} />
            </View>
          ))}
          <View style={{ alignSelf: 'flex-start' }}><Btn variant="ghost" small onPress={() => set('categories', [...cats, { name: 'New course', color: '#888888' }])}>+ Add course</Btn></View>
        </Card2>
        <Card2 title="Calendars">
          <Note>Follow a calendar link (your university timetable, Google Calendar...) and its events appear here and stay up to date. Links are kept on this phone only.</Note>
          {feeds.length ? feeds.map((f) => (
            <View key={f.id} style={{ gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <View>
                <Txt style={{ fontWeight: '700' }}>{f.name}</Txt>
                <Txt style={{ fontSize: 12, color: f.lastError ? c.neg : c.muted }}>{f.lastError ? f.lastError : `${f.count} event${f.count === 1 ? '' : 's'} · synced ${f.lastSync ? ago(f.lastSync) : 'never'} · ${f.category || 'no course'}`}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn variant="ghost" small busy={syncing === f.id} onPress={() => sync(f.id, f.name)}>{syncing === f.id ? 'Syncing…' : 'Sync'}</Btn>
                <Btn variant="danger" small onPress={() => drop(f.id, f.name, f.count)}>Remove</Btn>
              </View>
            </View>
          )) : <Note>No calendar links yet.</Note>}
          <Field label="Add a calendar link">
            <View style={{ gap: 8 }}>
              <Input value={fName} onChangeText={setFName} maxLength={60} placeholder="Name, for example UEF timetable" />
              <Input value={fUrl} onChangeText={setFUrl} placeholder="https://...  (a link ending in .ics, or an iCal link)" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Select label="Course" value={fCat} onChange={setFCat} options={catOptions} /></View>
                <Btn small busy={fBusy} onPress={addFeed}>Add calendar</Btn>
              </View>
            </View>
          </Field>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Btn variant="ghost" small onPress={importFile}>Import a file</Btn>
            <Btn variant="ghost" small onPress={exportIcs}>Export my calendar</Btn>
          </View>
          {fMsg ? <Txt style={{ fontSize: 12.5, color: c.neg }}>{fMsg}</Txt> : null}
        </Card2>
        <Card2 title="Reminders">
          <Field label="Assignments with no time are due at"><TimeField value={S.dueTime} onChange={(v) => set('dueTime', v)} /></Field>
          {remChips('assignment', 'assignments')}{remChips('event', 'events')}{remChips('todo', 'to-dos')}
          {nudges('assignment', 'assignments')}{nudges('event', 'events')}{nudges('todo', 'to-dos')}
          <Note>As the deadline gets closer, the latest rule that has started takes over. Example: "Right away, every 30 min", then "From the start of the due day, every 10 min".</Note>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Nag when overdue, every (hours, 0 = off)"><Input keyboardType="number-pad" value={String(S.nagHours)} onChangeText={(v) => set('nagHours', Math.max(0, num(v, 0)))} /></Field></View>
            <View style={{ flex: 1 }}><Field label="Morning summary at (hour, -1 = off)"><Input keyboardType="numbers-and-punctuation" value={String(S.digestHour)} onChangeText={(v) => set('digestHour', Math.max(-1, Math.min(23, num(v, -1))))} /></Field></View>
          </View>
        </Card2>
        <Card2 title="Notifications">
          <Check checked={S.notify && perm === 'on'} onChange={enable}>Reminders on this phone</Check>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Btn variant="ghost" small onPress={async () => { if (perm !== 'on') setPerm(await askPermission()); await sendTest(); toast.show('Test notification sent'); }}>Send test notification</Btn>
            <Btn variant="ghost" small onPress={() => void Linking.openSettings()}>Open phone notification settings</Btn>
          </View>
          <Txt style={{ fontSize: 12.5, color: perm === 'blocked' ? c.neg : c.muted }}>{perm === 'on' ? 'Notifications are allowed on this phone.' : perm === 'blocked' ? 'Notifications are blocked. Open the phone settings and allow ChronKeep.' : perm === 'unsupported' ? 'Notifications are not available here.' : 'Notifications are off. Turn them on above.'}</Txt>
        </Card2>
      </Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.glass }}>
        <Txt style={{ flex: 1, fontSize: 12.5, color: c.muted }}>{msg || (dirty ? 'Unsaved changes' : '')}</Txt>
        <Btn variant="ghost" onPress={discard} disabled={!dirty}>Discard changes</Btn>
        <Btn onPress={save} disabled={!dirty}>Save changes</Btn>
      </View>
    </View>
  );
}
