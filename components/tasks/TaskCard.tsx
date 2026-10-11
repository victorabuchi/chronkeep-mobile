import { Pressable, View } from 'react-native';
import { DOW, MON, lead } from '../../lib/dates';
import { day, isRepeat } from '../../lib/recur';
import { PRIO, colorOf, dueAt, everyLabel, isDone, rel } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import { FROM } from '../NudgeEditor';
import I from '../Icon';
import Tick from '../Tick';
import { Txt } from '../ui';

// A to-do as a big card: a large tick, the title, when it is due, and everything else about it (notes, steps with their own
// ticks and a progress bar, reminders, files). Meant for the full-page To-do view.
export default function TaskCard({ it, ds, settings, now, onOpen, onTick, onStep, group }: { it: Item; ds: string | null; settings: Settings; now: number; onOpen: () => void; onTick: () => void; onStep: (stepId: string) => void; group?: Item[] }) {
  const { c } = useTheme();
  const col = colorOf(settings, it.category, c.b), done = ds ? isDone(it, ds) : it.done, late = !!ds && !done && dueAt(it, ds, settings) < now;
  const subs = it.subtasks ?? [], sdone = subs.filter((x) => x.done).length, prio = it.priority ? PRIO[it.priority] : null;
  const [relText, relKind] = ds && !done ? rel(dueAt(it, ds, settings), now) : ['', 'ok' as const];
  const fact = (label: string, text: string) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
      <Txt style={{ fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.55, textTransform: 'uppercase', color: c.muted }}>{label}</Txt>
      <Txt style={{ flexShrink: 1, fontSize: 12.5, lineHeight: 17, color: c.ink2 }}>{text}</Txt>
    </View>
  );
  const reminds = [...(it.reminders ?? [])].sort((a, b) => b - a).map((m) => (m > 0 ? `${lead(m)} before` : 'at the time')).join(', ');
  const nudges = [...(it.nudges ?? [])].map((r) => { const l = (FROM.find(([v]) => String(v) === String(r.from)) ?? [0, ''])[1].toLowerCase(); return `every ${everyLabel(r.every)}${/^from/.test(l) ? ' ' + l : l === 'right away' ? ', right away' : ', starting ' + l}`; }).join('; ');
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={it.title} style={({ pressed }) => ({ gap: 12, padding: 16, borderWidth: 1, borderTopWidth: 4, borderRadius: 16, borderColor: late ? c.negLine : c.line, borderTopColor: late ? c.neg : col, backgroundColor: late ? c.negBg : c.card, opacity: done ? 0.6 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={{ paddingTop: 1 }}><Tick done={done} onPress={onTick} size={30} color={late ? c.neg : col} label={done ? 'Mark as not done' : 'Tick off'} /></View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Txt style={{ flexShrink: 1, fontSize: 18, lineHeight: 23, fontWeight: '800', letterSpacing: -0.27, textDecorationLine: done ? 'line-through' : 'none' }}>{it.title}</Txt>
            {group && group.length > 1 ? <View accessibilityLabel={`${group.length} on this day`} style={{ minWidth: 22, height: 20, paddingHorizontal: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.b }}><Txt style={{ color: c.onB, fontSize: 12, lineHeight: 15, fontWeight: '800' }}>{group.length}</Txt></View> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 }}>
            {ds ? <Txt style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}><Txt style={{ fontSize: 12.5, fontWeight: '800' }}>{DOW[day(ds).getDay()]} {day(ds).getDate()} {MON[day(ds).getMonth()]!.slice(0, 3)}{(() => { const t = group && group.length > 1 ? [...new Set(group.map((x) => x.time).filter(Boolean))].sort().join(', ') : it.time; return t ? `, ${t}` : ''; })()}</Txt>{relText ? <Txt style={{ fontSize: 12.5, fontWeight: '700', color: relKind === 'late' ? c.neg : relKind === 'soon' ? c.warn : c.muted }}>{` · ${relText}`}</Txt> : null}</Txt> : <Txt style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}>No date</Txt>}
            {it.category ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><Txt style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}>{it.category}{it.subject ? ` · ${it.subject}` : ''}</Txt></View> : null}
            {prio ? <Txt style={{ fontSize: 12.5, fontWeight: '800', color: prio[1] === 'neg' ? c.neg : prio[1] === 'warn' ? c.warn : prio[1] }}>{prio[0]} priority</Txt> : null}
            {isRepeat(it) ? <Txt style={{ fontSize: 12.5, color: c.muted, fontWeight: '600' }}>↻ {it.repeat}</Txt> : null}
          </View>
        </View>
      </View>
      {it.notes ? <View style={{ padding: 12, borderRadius: 10, backgroundColor: c.soft }}><Txt numberOfLines={6} style={{ fontSize: 13.5, lineHeight: 20 }}>{it.notes}</Txt></View> : null}
      {subs.length ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ fontSize: 12, fontWeight: '700', color: c.muted }}>{sdone} of {subs.length} steps</Txt>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.soft, overflow: 'hidden' }}><View style={{ width: `${Math.round((sdone / subs.length) * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: col }} /></View>
          </View>
          {subs.map((x) => (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 }}>
              <Tick done={x.done} size={20} burst={false} color={col} label="Tick step" onPress={() => onStep(x.id)} />
              <Txt style={{ flex: 1, fontSize: 14, color: x.done ? c.muted : c.ink, textDecorationLine: x.done ? 'line-through' : 'none' }}>{x.text}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {reminds ? fact('Reminds', reminds) : null}
      {nudges ? fact('Keeps reminding', nudges) : null}
      {it.attachments?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {it.attachments.map((a) => <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderRadius: 999, borderColor: c.line }}><I d="clip" size={12} color={c.muted} /><Txt style={{ fontSize: 12, fontWeight: '600' }}>{a.name}</Txt></View>)}
        </View>
      ) : null}
    </Pressable>
  );
}
