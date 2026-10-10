import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { Btn, Card, CardTitle, Field, Input, LinkBtn, Note, PageHead, Txt, useToast } from '../../components/ui';
import * as commands from '../../lib/commands';
import { backups, useData } from '../../lib/data';
import { fmtDay } from '../../lib/dates';
import { shareText } from '../../lib/share';
import { useTheme } from '../../lib/theme-context';

const backupLabel = (n: string) => {
  const m = n.match(/^data-(\d{4}-\d{2}-\d{2})\.json$/);
  if (m) return `Daily, ${fmtDay(m[1]!)}`;
  if (/pre-delete/.test(n)) return 'Before account deletion';
  if (/pre-restore/.test(n)) return 'Before a restore';
  const mm = n.match(/^data-manual-(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})\.json$/);
  return mm ? `Manual, ${fmtDay(mm[1]!)} ${mm[2]}:${mm[3]}` : n;
};
const stamp = () => { const d = new Date(), p = (n: number) => String(n).padStart(2, '0'); return `manual-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };

export default function Settings() {
  const { c } = useTheme();
  const toast = useToast();
  const profile = useData((d) => d.profile);
  const [name, setName] = useState(profile.name), [email, setEmail] = useState(profile.email), [phone, setPhone] = useState(profile.phone), [photo, setPhoto] = useState(profile.photo);
  const [msg, setMsg] = useState(''), [list, setList] = useState<Array<{ name: string; at: number }>>([]), [bMsg, setBMsg] = useState(''), [confirm, setConfirm] = useState('');
  const loadBackups = () => void backups.list().then(setList);
  useEffect(loadBackups, []);

  // The picture is shrunk to a small square so the data file stays light.
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (r.canceled) return;
    const img = await ImageManipulator.ImageManipulator.manipulate(r.assets[0]!.uri).resize({ width: 256 }).renderAsync();
    const out = await img.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.82, base64: true });
    setPhoto(`data:image/jpeg;base64,${out.base64}`);
  };
  const saveProfile = () => { commands.setProfile({ name: name.trim(), email: email.trim(), phone: phone.trim(), photo }); setMsg('Saved'); setTimeout(() => setMsg(''), 2500); };

  const exportData = async () => { if (!(await shareText('chronkeep-export.json', commands.exportJson(), 'application/json'))) toast.show('Sharing is not available on this device.', { error: true }); };
  const importData = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    try { const n = commands.importExport(await FileSystem.readAsStringAsync(r.assets[0]!.uri)); toast.show(n ? `${n} item${n === 1 ? '' : 's'} brought in from the web app` : 'Nothing new to bring in'); } catch { toast.show('That is not a ChronKeep export file.', { error: true }); }
  };

  const restore = (b: { name: string }) => Alert.alert('Replace your current data with this backup?', 'What you have now is saved as a backup first.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Restore', style: 'destructive', onPress: async () => {
      const data = await backups.read(b.name);
      if (!data) { setBMsg('That backup could not be restored.'); return; }
      await backups.now(`pre-restore-${Date.now()}`);
      commands.restoreFrom(data); loadBackups(); toast.show('Backup restored');
    } },
  ]);
  const backUp = async () => { await backups.now(stamp()); loadBackups(); setBMsg('Backed up'); setTimeout(() => setBMsg(''), 2500); };

  const need = (profile.email || 'DELETE').toLowerCase(), ok = confirm.trim().toLowerCase() === need;
  const del = async () => { await backups.now(`pre-delete-${Date.now()}`); commands.deleteEverything(); setConfirm(''); setName(''); setEmail(''); setPhone(''); setPhoto(''); toast.show('Your account was deleted'); };

  const Box = ({ title, children }: { title: string; children: React.ReactNode }) => <Card style={{ gap: 12, padding: 14 }}><CardTitle>{title}</CardTitle>{children}</Card>;
  return (
    <Screen>
      <PageHead eyebrow="Your account" title="Settings" />
      <Box title="Profile">
        <Field label="Profile picture">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={pickPhoto} accessibilityLabel="Change photo" style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, backgroundColor: c.soft }}>
              {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} /> : <I d="camera" size={22} color={c.muted} />}
            </Pressable>
            <View style={{ gap: 6, alignItems: 'flex-start' }}>
              <Btn variant="ghost" small onPress={pickPhoto}>{photo ? 'Change photo' : 'Add a photo'}</Btn>
              {photo ? <LinkBtn onPress={() => setPhoto('')}>Remove</LinkBtn> : null}
            </View>
          </View>
        </Field>
        <Field label="Name"><Input value={name} onChangeText={setName} maxLength={80} textContentType="name" /></Field>
        <Field label="Email"><Input value={email} onChangeText={setEmail} maxLength={120} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com" textContentType="emailAddress" /></Field>
        <Field label="Phone number"><Input value={phone} onChangeText={setPhone} maxLength={30} keyboardType="phone-pad" placeholder="+358 40 123 4567" textContentType="telephoneNumber" /></Field>
        <Note>Stored only on this phone, in your data file.</Note>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Btn onPress={saveProfile}>Save profile</Btn>{msg ? <Txt style={{ color: c.pos, fontSize: 12.5 }}>{msg}</Txt> : null}</View>
      </Box>
      <Box title="Your data">
        <Note>Download everything ChronKeep stores about you (profile, settings, tasks, events and your note) as a JSON file. You can also bring in an export from the web app.</Note>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Btn variant="ghost" small onPress={exportData}>Export my data</Btn>
          <Btn variant="ghost" small onPress={importData}>Import from the web app</Btn>
        </View>
      </Box>
      <Box title="Backups">
        <Note>ChronKeep keeps a copy of your data every day for two weeks, and a copy before anything risky. Restoring one first saves what you have now.</Note>
        {list.length ? list.slice(0, 8).map((b) => (
          <View key={b.name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}>
            <Txt style={{ flex: 1, fontWeight: '700' }}>{backupLabel(b.name)}</Txt>
            <Btn variant="ghost" small onPress={() => restore(b)}>Restore</Btn>
          </View>
        )) : <Note>No backups yet.</Note>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Btn variant="ghost" small onPress={backUp}>Back up now</Btn>{bMsg ? <Txt style={{ fontSize: 12.5, color: bMsg === 'Backed up' ? c.pos : c.neg }}>{bMsg}</Txt> : null}</View>
      </Box>
      <Card style={{ gap: 12, padding: 14, borderColor: c.negLine }}>
        <CardTitle>Delete account</CardTitle>
        <Note>Erases your profile, settings, tasks, events and note from this phone right away. A backup is kept first. Export your data first if you want a copy.</Note>
        <Field label={profile.email ? `Type ${profile.email} to confirm` : 'Type DELETE to confirm'}><Input value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoCorrect={false} /></Field>
        <View style={{ alignSelf: 'flex-start' }}><Btn variant="solidDanger" disabled={!ok} onPress={del}>Delete my account</Btn></View>
      </Card>
    </Screen>
  );
}
