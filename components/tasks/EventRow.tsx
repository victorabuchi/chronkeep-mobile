import { Pressable, View } from 'react-native';
import { DOW, MON } from '../../lib/dates';
import { day } from '../../lib/recur';
import { colorOf } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import { Txt } from '../ui';

// One upcoming event in the Tasks page's Events tab: a coloured bar, the title, and when and where.
export default function EventRow({ it, ds, settings, onOpen }: { it: Item; ds: string; settings: Settings; onOpen: () => void }) {
  const { c } = useTheme();
  const col = colorOf(settings, it.category, c.b), d = day(ds);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: pressed ? c.soft : 'transparent' })}>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: col }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Txt style={{ fontWeight: '600' }}>{it.title}</Txt>
        <Txt style={{ fontSize: 12, lineHeight: 18, color: c.muted }}>{DOW[d.getDay()]} {d.getDate()} {MON[d.getMonth()]!.slice(0, 3)}, {it.time ? `${it.time}${it.endTime ? ` to ${it.endTime}` : ''}` : 'All day'}{it.location ? ` · ${it.location}` : ''}{it.category ? ` · ${it.category}` : ''}</Txt>
      </View>
    </Pressable>
  );
}
