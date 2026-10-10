import { View } from 'react-native';
import EvMark from '../../components/EvMark';
import Screen from '../../components/Screen';
import Tick from '../../components/Tick';
import { Card, Empty, GroupLabel, LinkBtn, PageHead, Segment, Txt } from '../../components/ui';
import { useData } from '../../lib/data';
import { useItemActions, useNow } from '../../lib/hooks';
import { DOW, MON, typeLabel } from '../../lib/dates';
import { day, isRepeat } from '../../lib/recur';
import { colorOf, completedText, dueAt, groupLabel, historyRows, historyStats, lateText, type HistoryRow } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import { openItem } from '../../lib/ui-state';
import { useState } from 'react';

type F = 'all' | 'assignment' | 'todo' | 'event';
const FILTERS: Array<{ id: F; label: string }> = [{ id: 'all', label: 'All' }, { id: 'assignment', label: 'Assignments' }, { id: 'todo', label: 'To-do' }, { id: 'event', label: 'Events' }];

export default function History() {
  const { c } = useTheme();
  const settings = useData((d) => d.settings), items = useData((d) => d.items);
  const now = useNow(60000), act = useItemActions();
  const [f, setF] = useState<F>('all');
  const all = historyRows(items, settings, now), rows = all.filter((r) => f === 'all' || r.it.type === f), st = historyStats(all, settings, now);

  const groups: Array<[string, HistoryRow[]]> = [];
  for (const r of rows) { const g = groupLabel(r.when, now); if (groups[groups.length - 1]?.[0] !== g) groups.push([g, []]); groups[groups.length - 1]![1].push(r); }

  const row = (r: HistoryRow, i: number) => {
    const it = r.it, col = colorOf(settings, it.category, c.b), meta = { fontSize: 12, lineHeight: 18, color: c.muted };
    const d = r.ds ? day(r.ds) : null;
    return (
      <View key={`${it.id}${r.ds}${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
        {r.kind === 'done' ? <Tick done onPress={() => act.tick(it, r.ds ?? '')} label="Mark as not done" burst={false} /> : <EvMark color={col} icon="cal" />}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt onPress={() => openItem(it, undefined, r.ds ?? undefined)} style={{ fontWeight: '600' }}>{it.title}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 2 }}>
            <Txt style={{ ...meta, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>{typeLabel(it.type)}</Txt>
            {it.category ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><Txt style={meta}>{it.category}</Txt></View> : null}
            {d ? <Txt style={meta}>{it.type === 'event' ? '' : 'Due '}{DOW[d.getDay()]} {d.getDate()} {MON[d.getMonth()]!.slice(0, 3)}{it.time ? `, ${it.time}${it.endTime ? ` to ${it.endTime}` : ''}` : ''}</Txt> : null}
            {r.kind === 'done' && !isRepeat(it) && it.doneAt ? (() => {
              const late = r.ds ? it.doneAt - dueAt(it, r.ds, settings) : 0;
              return <><Txt style={meta}>{completedText(it.doneAt)}</Txt>{r.ds && it.type === 'assignment' ? <View style={{ paddingHorizontal: 7, borderRadius: 999, backgroundColor: late > 0 ? c.negBg : c.posBg }}><Txt style={{ fontSize: 11.5, lineHeight: 17, fontWeight: '700', color: late > 0 ? c.neg : c.pos }}>{late > 0 ? `${lateText(late)} late` : 'On time'}</Txt></View> : null}</>;
            })() : null}
          </View>
        </View>
        {r.kind === 'done' ? <LinkBtn onPress={() => act.tick(it, r.ds ?? '')}>Undo</LinkBtn> : null}
      </View>
    );
  };

  return (
    <Screen>
      <PageHead eyebrow="Completed and past" title="History" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[[st.completed, 'Completed in the last 30 days'], [st.onTime, 'Assignments finished on time'], [st.events, 'Events in the last 30 days']].map(([n, l]) => (
          <Card key={String(l)} style={{ flex: 1, padding: 10, gap: 2 }}><Txt style={{ fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 }}>{n}</Txt><Txt style={{ fontSize: 11.5, lineHeight: 15, color: c.muted }}>{l}</Txt></Card>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Segment options={FILTERS} value={f} onChange={setF} wide />
        <Txt style={{ color: c.muted, fontSize: 12.5 }}>{rows.length} item{rows.length === 1 ? '' : 's'}</Txt>
      </View>
      {rows.length ? groups.map(([g, list]) => (
        <View key={g}><GroupLabel>{g}</GroupLabel><Card style={{ overflow: 'hidden', padding: 0 }}>{list.map(row)}</Card></View>
      )) : <Empty>{f === 'event' ? 'No past events yet.' : 'Nothing here yet. Tick off an assignment or to-do and it will show up here.'}</Empty>}
    </Screen>
  );
}
