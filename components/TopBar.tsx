import { useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../lib/haptics';
import { useData } from '../lib/data';
import { setUI, openItem, getUI } from '../lib/ui-state';
import { ymd } from '../lib/recur';
import { useTheme } from '../lib/theme-context';
import I from './Icon';
import Mark from './Mark';
import { Txt } from './ui';

// The top bar of every page (.top): the logo (home), then the buttons.
export default function TopBar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useData((d) => d.profile);
  const initials = (profile.name || 'C').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const box = { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card } as const;
  return (
    <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.glass }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }}>
        <Pressable onPress={() => { tap(); setUI({ cur: ymd(new Date()) }); router.navigate('/calendar'); }} accessibilityRole="button" accessibilityLabel="ChronKeep home" style={{ padding: 2 }}>
          <Mark size={32} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { tap(); openItem(null); }} accessibilityRole="button" accessibilityLabel="New" style={{ ...box, backgroundColor: c.b, borderColor: c.b }}>
          <I d="plus" size={17} stroke={2.6} color={c.onB} />
        </Pressable>
        <Pressable onPress={() => { tap(); router.navigate('/settings'); }} accessibilityRole="button" accessibilityLabel="Account" style={{ ...box, borderRadius: 18, overflow: 'hidden', backgroundColor: c.bt }}>
          {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: '100%', height: '100%' }} /> : <Txt style={{ color: c.b, fontSize: 12, fontWeight: '800' }}>{initials}</Txt>}
        </Pressable>
      </View>
    </View>
  );
}
void getUI;
