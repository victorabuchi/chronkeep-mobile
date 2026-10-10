import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../lib/haptics';
import { useData } from '../lib/data';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';
import { Txt } from './ui';

// The phone tab bar: the same six pages as the web's left rail, icons only.
export const NAV: Array<[IconName, string, string]> = [
  ['cal', 'Calendar', 'calendar'],
  ['tasks', 'Tasks', 'tasks'],
  ['history', 'History', 'history'],
  ['bin', 'Bin', 'bin'],
  ['sliders', 'Customize', 'customize'],
  ['gear', 'Settings', 'settings'],
];

export const tabsHeight = (bottomInset: number) => 58 + bottomInset;

export default function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const bin = useData((d) => d.trash.length);
  const active = state.routes[state.index]?.name;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: tabsHeight(insets.bottom), paddingTop: 6, paddingHorizontal: 6, paddingBottom: insets.bottom + 6, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.glass }}>
      {NAV.map(([icon, label, route]) => {
        const on = active === route;
        return (
          <Pressable key={route} onPress={() => { tap(); navigation.navigate(route); }} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} style={({ pressed }) => ({ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: on ? c.bt : 'transparent', transform: [{ scale: pressed ? 0.9 : 1 }] })}>
            <I d={icon} size={19} color={on ? c.b : c.muted} />
            {route === 'bin' && bin > 0 ? (
              <View style={{ position: 'absolute', top: 3, right: 10, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ color: c.onB, fontSize: 10, lineHeight: 12, fontWeight: '800' }}>{bin}</Txt>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
