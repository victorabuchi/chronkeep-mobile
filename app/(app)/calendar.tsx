import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import DueSheet from '../../components/calendar/DueSheet';
import MonthGrid from '../../components/calendar/MonthGrid';
import TimeGrid from '../../components/calendar/TimeGrid';
import { Btn, Chip, IBtn, PageHead, Segment, Txt } from '../../components/ui';
import { daysFor, eyebrow, hhmm, step, title } from '../../lib/calendar-layout';
import { useData } from '../../lib/data';
import { useItemActions, useNow } from '../../lib/hooks';
import { ymd } from '../../lib/recur';
import { useTheme } from '../../lib/theme-context';
import { getUI, openItem, setUI, useUI, type TypeFilter, type View as CalView } from '../../lib/ui-state';

const VIEWS: Array<{ id: CalView; label: string }> = [{ id: 'day', label: 'Day' }, { id: '3days', label: '3 days' }, { id: 'week', label: '7 days' }];
const TYPES: Array<{ id: TypeFilter; label: string }> = [{ id: 'all', label: 'All' }, { id: 'assignment', label: 'Assignments' }, { id: 'event', label: 'Events' }, { id: 'todo', label: 'To-dos' }];

export default function Calendar() {
  const { c } = useTheme();
  const settings = useData((d) => d.settings), items = useData((d) => d.items);
  const cur = useUI((u) => u.cur), view = useUI((u) => u.view), typeF = useUI((u) => u.typeF);
  const now = useNow(), act = useItemActions(), router = useRouter();
  // Back from the full-screen assignments page: show everything again.
  useFocusEffect(useCallback(() => { if (getUI().typeF === 'todo') setUI({ typeF: 'all' }); }, []));
  // chronkeep://calendar?view=week opens the calendar in that view (day, 3days, week or month)
  // (and ?date=2026-10-13 goes to that day)
  const { view: want, date: wantDate } = useLocalSearchParams<{ view?: string; date?: string }>();
  useEffect(() => { if (want === 'day' || want === '3days' || want === 'week' || want === 'month') setUI({ view: want }); }, [want]);
  useEffect(() => { if (wantDate && /^\d{4}-\d{2}-\d{2}$/.test(wantDate)) setUI({ cur: wantDate }); }, [wantDate]);
  const [box, setBox] = useState({ w: 0, h: 0 }), [dueDay, setDueDay] = useState<string | null>(null);
  const days = daysFor(view, cur, settings), today = ymd(new Date(now));
  const go = (n: number) => setUI({ cur: step(view, cur, n) });
  const onOpen = (it: (typeof items)[number], occ: string) => openItem(it, undefined, occ);

  const head = (
    <View style={{ gap: 10, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10 }}>
      <PageHead eyebrow={eyebrow(view, days)} title={title(view, days, cur)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IBtn icon="left" label="Previous" onPress={() => go(-1)} />
        <IBtn icon="right" label="Next" onPress={() => go(1)} />
        <Btn small variant="ghost" onPress={() => setUI({ cur: today })} disabled={cur === today && view !== 'month'}>Today</Btn>
        <View style={{ flex: 1 }} />
        <Segment options={VIEWS} value={view} onChange={(v) => setUI({ view: v })} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {TYPES.map((t) => <Chip key={t.id} on={typeF === t.id} onPress={() => { setUI({ typeF: t.id }); if (t.id === 'todo') router.navigate('/tasks'); /* to-dos get the whole screen, as big cards */ }}>{t.label}</Chip>)}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {view === 'month' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {head}
          <View style={{ marginHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
            <MonthGrid cur={cur} items={items} settings={settings} typeF={typeF} now={now} onOpen={onOpen} onDay={(ds) => setUI({ cur: ds, view: 'day' })} onTick={(it, ds) => act.tick(it, ds, 220)} onDue={setDueDay} />
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {head}
          {box.w > 0 ? (
            <View style={{ marginHorizontal: 12, flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
              <TimeGrid days={days} items={items} settings={settings} typeF={typeF} now={now} width={box.w - 26} height={Math.max(260, box.h - 190)} onOpen={onOpen} onCreate={(ds, m) => openItem(null, { type: 'event', date: ds, time: hhmm(m) })} onTick={(it, ds) => act.tick(it, ds, 220)} onDue={setDueDay} />
            </View>
          ) : null}
        </View>
      )}
      <DueSheet ds={dueDay} items={items} settings={settings} typeF={typeF} now={now} onClose={() => setDueDay(null)} onOpen={onOpen} onTick={(it, ds) => act.tick(it, ds)} />
    </View>
  );
}
void Txt;
