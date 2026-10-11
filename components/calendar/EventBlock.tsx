import { Pressable, View } from 'react-native';
import { fgOn } from '../../lib/theme';
import type { Item } from '../../lib/types';
import { Txt } from '../ui';

// A timed event in the day's hours: a flat, solid block in the course colour, like the web's .ev.
export default function EventBlock({ it, label, color, top, height, left, width, first, last, onOpen, onLongPress }: { it: Item; label: string; color: string; top: number; height: number; left: number; width: number; first: boolean; last: boolean; onOpen: () => void; onLongPress?: () => void }) {
  const fg = fgOn(color);
  const sub = it.location || it.subject || it.category;
  return (
    <Pressable onPress={onOpen} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ position: 'absolute', top, height, left, width, overflow: 'hidden', paddingVertical: 3, paddingHorizontal: 6, borderTopLeftRadius: first ? 3 : 0, borderTopRightRadius: first ? 3 : 0, borderBottomLeftRadius: last ? 3 : 0, borderBottomRightRadius: last ? 3 : 0, backgroundColor: color, opacity: pressed ? 0.85 : 1 })}>
      <Txt style={{ fontSize: 11, lineHeight: 14, fontWeight: '600', color: fg, opacity: 0.8 }}>{label}</Txt>
      <Txt style={{ fontSize: 12.5, lineHeight: 16, fontWeight: '700', color: fg }} numberOfLines={Math.max(1, Math.floor((height - 20) / 16))}>{it.title}</Txt>
      {sub ? <Txt numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontWeight: '600', color: fg, opacity: 0.8 }}>{sub}</Txt> : null}
      <View />
    </Pressable>
  );
}
