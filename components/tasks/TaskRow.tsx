import { Pressable, View } from 'react-native';
import { DOW, MON, typeLabel } from '../../lib/dates';
import { isRepeat, day } from '../../lib/recur';
import { PRIO, colorOf, dueAt, everyLabel, isDone, nudgeNow, rel } from '../../lib/selectors';
import { alpha } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import I from '../Icon';
import Tick from '../Tick';
import { Txt } from '../ui';

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'late' | 'soon' | 'ok' | 'nudge' }) {
  const { c } = useTheme();
  const t = tone === 'late' ? { bg: c.negBg, fg: c.neg } : tone === 'soon' ? { bg: c.warnBg, fg: c.warn } : tone === 'nudge' ? { bg: c.bt, fg: c.b } : { bg: c.soft, fg: c.ink2 };
  return <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: t.bg }}><Txt style={{ fontSize: 11.5, lineHeight: 17, fontWeight: '700', color: t.fg }}>{children}</Txt></View>;
}

// One task: its tick, title, a line of facts (kind, course, due, countdown, priority, steps, files, repeat) and its steps.
export default function TaskRow({ it, ds, settings, now, onOpen, onTick, onStep, group }: { it: Item; ds: string | null; settings: Settings; now: number; onOpen: () => void; onTick: () => void; onStep: (stepId: string) => void; group?: Item[] }) {
  const { c } = useTheme();
  const done = ds ? isDone(it, ds) : it.done, col = colorOf(settings, it.category, c.b);
  const late = !!ds && !done && dueAt(it, ds, settings) < now;
  const subs = it.subtasks || [], sdone = subs.filter((x) => x.done).length;
  const rule = ds && !done && it.nudges?.length ? nudgeNow(it, ds, settings, now) : null;
  const prio = it.priority ? PRIO[it.priority] : null;
  const meta = { fontSize: 12, lineHeight: 18, color: c.muted };
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: pressed ? c.soft : 'transparent', opacity: done ? 0.55 : 1 })}>
      <View style={{ paddingTop: 1 }}><Tick done={done} onPress={onTick} /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt style={{ flexShrink: 1, fontWeight: '600', textDecorationLine: done ? 'line-through' : 'none' }}>{it.title}</Txt>
          {group && group.length > 1 ? <View accessibilityLabel={`${group.length} on this day`} style={{ minWidth: 20, height: 18, paddingHorizontal: 6, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.b }}><Txt style={{ color: c.onB, fontSize: 11, lineHeight: 14, fontWeight: '800' }}>{group.length}</Txt></View> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 3 }}>
          <Txt style={{ ...meta, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>{typeLabel(it.type)}</Txt>
          {it.category ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><Txt style={meta}>{it.category}</Txt></View> : null}
          {ds ? <Txt style={meta}>{DOW[day(ds).getDay()]} {day(ds).getDate()} {MON[day(ds).getMonth()]!.slice(0, 3)}{(() => { const t = group && group.length > 1 ? [...new Set(group.map((x) => x.time).filter(Boolean))].sort().join(', ') : it.time; return t ? `, ${t}` : ''; })()}</Txt> : null}
          {ds && !done ? (() => { const [t, k] = rel(dueAt(it, ds, settings), now); return <Pill tone={k}>{t}</Pill>; })() : null}
          {rule ? <Pill tone="nudge">every {everyLabel(rule.every)}</Pill> : null}
          {prio ? <Txt style={{ ...meta, fontWeight: '700', color: prio[1] === 'neg' ? c.neg : prio[1] === 'warn' ? c.warn : prio[1] }}>{prio[0]}</Txt> : null}
          {subs.length ? <Pill>{sdone}/{subs.length} steps</Pill> : null}
          {it.attachments?.length ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><I d="clip" size={12} color={c.muted} /><Txt style={meta}>{it.attachments.length}</Txt></View> : null}
          {isRepeat(it) ? <Txt style={meta}>↻ {it.repeat}</Txt> : null}
        </View>
        {subs.length ? (
          <View style={{ gap: 4, marginTop: 4 }}>
            {subs.map((x) => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tick done={x.done} size={15} onPress={() => onStep(x.id)} label="Tick step" burst={false} />
                <Txt style={{ flex: 1, fontSize: 13, color: x.done ? c.muted : c.ink2, textDecorationLine: x.done ? 'line-through' : 'none' }}>{x.text}</Txt>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {late ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: alpha(c.neg, 1) }} /> : null}
    </Pressable>
  );
}
