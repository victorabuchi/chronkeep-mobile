import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as commands from '../lib/commands';
import { useData } from '../lib/data';
import { tap } from '../lib/haptics';
import { sendTest } from '../lib/notify';
import { signOutAndWipe } from '../lib/sync-run';
import { ymd } from '../lib/recur';
import { useTheme } from '../lib/theme-context';
import { openItem, setUI } from '../lib/ui-state';
import I from './Icon';
import NotifBanner from './NotifBanner';
import NoteSheet from './topbar/NoteSheet';
import NotifSheet from './topbar/NotifSheet';
import SearchBar from './topbar/SearchBar';
import Popover, { MenuHead, MenuItem } from './Popover';
import { IBtn, Txt, useToast } from './ui';

// The top bar of every page (.top): logo (home), search, note, bell, New and the avatar.
export default function TopBar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter(), toast = useToast();
  const profile = useData((d) => d.profile);
  // On a narrow screen the wordmark leaves no room for the search box, so it is an icon until tapped.
  const narrow = useWindowDimensions().width < 440, [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false), [note, setNote] = useState(false), [bell, setBell] = useState(false), [menu, setMenu] = useState(false);
  const initials = (profile.name || 'C').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const box = { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card } as const;
  const go = (path: '/settings' | '/customize') => { setMenu(false); router.navigate(path); };
  return (
    <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.glass, zIndex: 10 }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }}>
        <Pressable onPress={() => { tap(); setUI({ cur: ymd(new Date()) }); router.navigate('/calendar'); }} accessibilityRole="button" accessibilityLabel="ChronKeep home" style={{ padding: 2, display: searching ? 'none' : 'flex' }}>
          <Image source={require('../assets/wordmark.png')} resizeMode="contain" accessibilityLabel="ChronKeep" style={{ width: 96, height: 18, tintColor: undefined }} />
        </Pressable>
        {narrow && !searchOpen ? <View style={{ flex: 1 }} /> : <SearchBar autoFocus={narrow} onFocusChange={(f) => { setSearching(f); if (!f) setSearchOpen(false); }} />}
        {!searching ? (
          <>
            {narrow && !searchOpen ? <IBtn icon="search" label="Search" onPress={() => setSearchOpen(true)} /> : null}
            <IBtn icon="note" label="Note" onPress={() => setNote(true)} />
            <IBtn icon="bell" label="Notifications" onPress={() => setBell(true)} />
            <Pressable onPress={() => { tap(); openItem(null); }} accessibilityRole="button" accessibilityLabel="New" style={{ ...box, backgroundColor: c.b, borderColor: c.b }}>
              <I d="plus" size={17} stroke={2.6} color={c.onB} />
            </Pressable>
            <Pressable onPress={() => { tap(); setMenu(true); }} accessibilityRole="button" accessibilityLabel="Account" style={{ ...box, borderRadius: 18, overflow: 'hidden', backgroundColor: c.bt }}>
              {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: '100%', height: '100%' }} /> : <Txt style={{ color: c.b, fontSize: 12, fontWeight: '800' }}>{initials}</Txt>}
            </Pressable>
          </>
        ) : null}
      </View>
      <NotifBanner />
      <NoteSheet open={note} onClose={() => setNote(false)} />
      <NotifSheet open={bell} onClose={() => setBell(false)} />
      <Popover open={menu} onClose={() => setMenu(false)}>
        <MenuHead title={profile.name || 'Your account'} subtitle={profile.email || 'Personal planner'} />
        <MenuItem icon="gear" label="Settings" onPress={() => go('/settings')} />
        <MenuItem icon="sliders" label="Customize" onPress={() => go('/customize')} />
        <MenuItem icon="bell" label="Send test notification" onPress={() => { setMenu(false); void sendTest().then(() => toast.show('Test notification sent')); }} />
        <MenuItem icon="out" label="Log out" danger onPress={() => {
          setMenu(false);
          Alert.alert('Log out?', 'Your data stays in your account. It is removed from this phone, and comes back when you log in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void signOutAndWipe() }]);
        }} />
      </Popover>
    </View>
  );
}
void commands;
