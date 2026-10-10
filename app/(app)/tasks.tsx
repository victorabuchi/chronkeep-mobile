import { useState } from 'react';
import { LayoutAnimation, View } from 'react-native';
import Screen from '../../components/Screen';
import QuickAdd from '../../components/tasks/QuickAdd';
import TaskRow from '../../components/tasks/TaskRow';
import { Btn, Card, Empty, GroupLabel, PageHead, Segment, Txt } from '../../components/ui';
import { useData } from '../../lib/data';
import { useItemActions, useNow } from '../../lib/hooks';
import { taskGroups } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import { openItem, setUI, useUI, type TypeFilter } from '../../lib/ui-state';

const FILTERS: Array<{ id: TypeFilter; label: string }> = [{ id: 'all', label: 'All' }, { id: 'assignment', label: 'Assignments' }, { id: 'todo', label: 'To-do' }];

export default function Tasks() {
  const { c } = useTheme();
  const settings = useData((d) => d.settings), items = useData((d) => d.items);
  const typeF = useUI((u) => u.typeF), now = useNow(30000), act = useItemActions();
  const [showDone, setShowDone] = useState(false);
  const g = taskGroups(items, typeF === 'event' ? 'all' : typeF, settings, now);
  const rows = (list: typeof g.done) => list.map(({ it, ds }) => <TaskRow key={it.id + (ds ?? '')} it={it} ds={ds} settings={settings} now={now} onOpen={() => openItem(it, undefined, ds ?? undefined)} onTick={() => act.tick(it, ds ?? '', 220)} onStep={(sid) => act.step(it, sid, ds ?? '')} />);
  return (
    <Screen>
      <PageHead eyebrow="Everything you owe" title="Tasks" right={
        <View style={{ gap: 8 }}>
          <Segment options={FILTERS} value={typeF === 'event' ? 'all' : typeF} onChange={(v) => setUI({ typeF: v })} wide />
          <Txt style={{ color: c.muted, fontSize: 12.5 }}>{g.open} open{g.overdue ? ` · ${g.overdue} overdue` : ''}</Txt>
        </View>
      } />
      <QuickAdd settings={settings} />
      {g.groups.map(([name, list]) => (
        <View key={name}>
          <GroupLabel red={name === 'Overdue'} count={list.length}>{name}</GroupLabel>
          <Card style={{ overflow: 'hidden', padding: 0, borderColor: name === 'Overdue' ? c.negLine : c.line }}>{rows(list).map((r, i) => (i === 0 ? <View key={r.key} style={{ marginTop: -1 }}>{r}</View> : r))}</Card>
        </View>
      ))}
      {!g.open ? <Empty>Nothing left to do.</Empty> : null}
      {g.done.length ? (
        <>
          <Btn variant="ghost" small onPress={() => { LayoutAnimation.easeInEaseOut(); setShowDone((v) => !v); }}>{showDone ? 'Hide' : 'Show'} {g.done.length} completed</Btn>
          {showDone ? <View><GroupLabel count={g.done.length}>Completed</GroupLabel><Card style={{ overflow: 'hidden', padding: 0 }}>{rows(g.done)}</Card></View> : null}
        </>
      ) : null}
    </Screen>
  );
}
