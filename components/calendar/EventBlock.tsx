import { Pressable, View } from 'react-native';
import { edge, tint } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item } from '../../lib/types';
import { Txt } from '../ui';

// A timed event in the day's hours: a tinted block with a coloured left edge, like the web's .ev.
export default function EventBlock({ it, label, color, top, height, left, width, first, last, onOpen, onLongPress }: { it: Item; label: string; color: string; top: number; height: number; left: number; width: number; first: boolean; last: boolean; onOpen: () => void; onLongPress?: () => void }) {
  const { c } = useTheme();
  const sub = it.location || it.category;
  return (
    <Pressable onPress={onOpen} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ position: 'absolute', top, height, left, width, overflow: 'hidden', paddingVertical: 3, paddingHorizontal: 6, borderWidth: 1, borderLeftWidth: 3, borderLeftColor: color, borderColor: edge(c, color), borderTopLeftRadius: first ? 7 : 0, borderTopRightRadius: first ? 7 : 0, borderBottomLeftRadius: last ? 7 : 0, borderBottomRightRadius: last ? 7 : 0, borderTopWidth: first ? 1 : 1, backgroundColor: tint(c, color), opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <Txt style={{ fontSize: 11, lineHeight: 14, fontWeight: '600', color: c.muted }}>{label}</Txt>
      <Txt style={{ fontSize: 12.5, lineHeight: 16, fontWeight: '700' }} numberOfLines={Math.max(1, Math.floor((height - 20) / 16))}>{it.title}</Txt>
      {sub ? <Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontWeight: '600', color }}>{sub}</Txt> : null}
      <View />
    </Pressable>
  );
}
