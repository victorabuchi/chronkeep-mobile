import { useState } from 'react';
import { LayoutAnimation, View } from 'react-native';
import Screen from '../../components/Screen';
import QuickAdd from '../../components/tasks/QuickAdd';
import TaskCard from '../../components/tasks/TaskCard';
import TaskRow from '../../components/tasks/TaskRow';
import { Btn, Card, Empty, GroupLabel, PageHead, Segment, Txt } from '../../components/ui';
import { useData } from '../../lib/data';
import { mergeEntries, upcomingEvents } from '../../lib/due';
import EventRow from '../../components/tasks/EventRow';
import { useItemActions, useNow } from '../../lib/hooks';
import { taskGroups } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import { openItem, setUI, useUI, type TypeFilter } from '../../lib/ui-state';

const FILTERS: Array<{ id: TypeFilter; label: string }> = [{ id: 'all', label: 'All' }, { id: 'assignment', label: 'Assignments' }, { id: 'todo', label: 'To-do' }, { id: 'event', label: 'Events' }];

export default function Tasks() {
  const { c } = useTheme();
  const settings = useData((d) => d.settings), items = useData((d) => d.items);
  const typeF = useUI((u) => u.typeF), now = useNow(30000), act = useItemActions();
  const [showDone, setShowDone] = useState(false);
  // To-do = everything still to do (assignments and to-dos), as big cards; the other filters pick one type.
  const g = taskGroups(items, typeF === 'event' || typeF === 'todo' ? 'all' : typeF, settings, now);
  // Same-title tasks on one day are one row with a count; ticking it ticks them all.
  // To-dos are shown as big cards with every detail; assignments as compact rows.
  const cards = typeF === 'todo';
  const events = typeF === 'event' ? upcomingEvents(items, now) : null;
  const cardsOf = (list: typeof g.done) => mergeEntries(list).map((grp) => { const { it, ds } = grp[0]!; return <TaskCard key={it.id + (ds ?? '')} it={it} ds={ds} group={grp.map((x) => x.it)} settings={settings} now={now} onOpen={() => openItem(it, undefined, ds ?? undefined)} onTick={() => grp.forEach((x) => act.tick(x.it, x.ds ?? '', 220))} onStep={(sid) => act.step(it, sid, ds ?? '')} />; });
  const rows = (list: typeof g.done) => mergeEntries(list).map((grp) => { const { it, ds } = grp[0]!; return <TaskRow key={it.id + (ds ?? '')} it={it} ds={ds} group={grp.map((x) => x.it)} settings={settings} now={now} onOpen={() => openItem(it, undefined, ds ?? undefined)} onTick={() => grp.forEach((x) => act.tick(x.it, x.ds ?? '', 220))} onStep={(sid) => act.step(it, sid, ds ?? '')} />; });
  return (
    <Screen>
      <PageHead eyebrow="Everything you owe" title="Tasks" right={
        <View style={{ gap: 8 }}>
          <Segment options={FILTERS} value={typeF} onChange={(v) => setUI({ typeF: v })} wide />
          <Txt style={{ color: c.muted, fontSize: 12.5 }}>{events ? `${events.reduce((n, [, l]) => n + l.length, 0)} coming up` : `${g.open} open${g.overdue ? ` · ${g.overdue} overdue` : ''}`}</Txt>
        </View>
      } />
      <QuickAdd settings={settings} />
      {events ? (
        events.length ? events.map(([name, list]) => (
          <View key={name}>
            <GroupLabel count={list.length}>{name}</GroupLabel>
            <Card style={{ overflow: 'hidden', padding: 0 }}>{list.map(({ it, ds }, i) => <View key={it.id + ds} style={{ marginTop: i === 0 ? -1 : 0 }}><EventRow it={it} ds={ds} settings={settings} onOpen={() => openItem(it, undefined, ds)} /></View>)}</Card>
          </View>
        )) : <Empty>No events in the next 30 days.</Empty>
      ) : (
        <>
      {g.groups.map(([name, list]) => (
          <View key={name}>
            <GroupLabel red={name === 'Overdue'} count={list.length}>{name}</GroupLabel>
            {cards ? <View style={{ gap: 12 }}>{cardsOf(list)}</View> : <Card style={{ overflow: 'hidden', padding: 0, borderColor: name === 'Overdue' ? c.negLine : c.line }}>{rows(list).map((r, i) => (i === 0 ? <View key={r.key} style={{ marginTop: -1 }}>{r}</View> : r))}</Card>}
          </View>
        ))}
        {!g.open ? <Empty>Nothing left to do.</Empty> : null}
        {g.done.length ? (
          <>
            <Btn variant="ghost" small onPress={() => { LayoutAnimation.easeInEaseOut(); setShowDone((v) => !v); }}>{showDone ? 'Hide' : 'Show'} {g.done.length} completed</Btn>
            {showDone ? <View><GroupLabel count={g.done.length}>Completed</GroupLabel>{cards ? <View style={{ gap: 12 }}>{cardsOf(g.done)}</View> : <Card style={{ overflow: 'hidden', padding: 0 }}>{rows(g.done)}</Card>}</View> : null}
          </>
        ) : null}
        </>
      )}
    </Screen>
  );
}
