import { Pressable, View } from 'react-native';
import { stripOf } from '../../lib/due';
import { colorOf, dueAt, isDone } from '../../lib/selectors';
import { alpha, edge, tint } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import Tick from '../Tick';
import { Txt } from '../ui';
import ItemChip, { occOf } from './ItemChip';

// A day's deadline strip: up to three one-line-ish pills, same-title ones merged into a counted pill, then "+N more".
// Tapping a merged pill or "+N more" opens the day's list (onMore); a single pill opens its item, with its tick.
export default function DueStrip({ list, ds, settings, now, onOpen, onTick, onMore, month }: { list: Item[]; ds: string; settings: Settings; now: number; onOpen: (it: Item, occ: string) => void; onTick: (it: Item, ds: string) => void; onMore: (ds: string) => void; month?: boolean }) {
  const { c } = useTheme();
  const { shown, rest } = stripOf(list, month ? 4 : 3);
  return (
    <>
      {shown.map((g) => {
        if (g.length === 1) {
          const it = g[0]!;
          return month ? <ItemChip key={it.id} it={it} ds={ds} settings={settings} now={now} month onOpen={() => onOpen(it, occOf(it, ds))} onTick={() => onTick(it, ds)} /> : <Pill key={it.id} it={it} ds={ds} settings={settings} now={now} onOpen={() => onOpen(it, occOf(it, ds))} onTick={() => onTick(it, ds)} />;
        }
        const it = g[0]!, col = colorOf(settings, it.category, c.b), done = g.every((x) => isDone(x, ds)), late = !done && g.some((x) => x.type !== 'event' && !isDone(x, ds) && dueAt(x, ds, settings) < now);
        const tone = late ? { bg: c.negBg, border: c.negLine, fg: c.neg, badge: c.neg } : { bg: tint(c, col), border: edge(c, col), fg: c.ink, badge: col };
        return (
          <Pressable key={g.map((x) => x.id).join('')} onPress={() => onMore(ds)} accessibilityRole="button" accessibilityLabel={`${it.title}, ${g.length} due`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: month ? 20 : 24, paddingVertical: 2, paddingLeft: 6, paddingRight: 4, borderWidth: 1, borderRadius: 7, borderColor: tone.border, backgroundColor: tone.bg, opacity: done ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <Txt numberOfLines={month ? 1 : 2} style={{ flex: 1, fontSize: month ? 11 : 11.5, lineHeight: month ? 14 : 14, fontWeight: '600', color: tone.fg }}>{it.title}</Txt>
            <View style={{ minWidth: 17, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.badge }}><Txt style={{ color: '#fff', fontSize: 10.5, lineHeight: 13, fontWeight: '800' }}>{g.length}</Txt></View>
          </Pressable>
        );
      })}
      {rest ? (
        <Pressable onPress={() => onMore(ds)} accessibilityRole="button" accessibilityLabel={`${rest} more due`} style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', minHeight: month ? 18 : 22, borderWidth: 1, borderStyle: 'dashed', borderRadius: 7, borderColor: c.line2, backgroundColor: pressed ? c.soft : 'transparent' })}>
          <Txt style={{ fontSize: 11, lineHeight: 14, fontWeight: '700', color: c.muted }}>+{rest} more</Txt>
        </Pressable>
      ) : null}
    </>
  );
}

// One deadline: its tick and its title, up to two lines (the time is in the day's list).
function Pill({ it, ds, settings, now, onOpen, onTick }: { it: Item; ds: string; settings: Settings; now: number; onOpen: () => void; onTick: () => void }) {
  const { c } = useTheme();
  const col = colorOf(settings, it.category, c.b), task = it.type !== 'event', done = isDone(it, ds), late = task && !done && dueAt(it, ds, settings) < now;
  const tone = late ? { bg: c.negBg, border: c.negLine, fg: c.neg } : { bg: tint(c, col), border: edge(c, col), fg: c.ink };
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24, paddingVertical: 2, paddingLeft: 4, paddingRight: 5, borderWidth: 1, borderRadius: 7, borderColor: tone.border, backgroundColor: tone.bg, opacity: done ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      {task ? <Tick done={done} onPress={onTick} size={14} color={late ? c.neg : col} label="Tick off" /> : <View style={{ width: 2 }} />}
      <Txt numberOfLines={2} style={{ flex: 1, fontSize: 11.5, lineHeight: 14, fontWeight: '600', color: tone.fg, textDecorationLine: done ? 'line-through' : 'none' }}>{it.priority === 'high' ? '! ' : ''}{it.title}</Txt>
    </Pressable>
  );
}
void alpha;
