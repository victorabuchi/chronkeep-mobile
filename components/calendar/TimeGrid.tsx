import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { HH, hhmm, lanes, snap15 } from '../../lib/calendar-layout';
import { DOW, pad } from '../../lib/dates';
import { segment, ymd } from '../../lib/recur';
import { colorOf, matchesFilter, showsOn } from '../../lib/selectors';
import { mix } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import type { TypeFilter } from '../../lib/ui-state';
import { Txt } from '../ui';
import EventBlock from './EventBlock';
import ItemChip, { occOf } from './ItemChip';

const GUTTER = 40;

// The day or three-day view: day heads, a row of deadlines and all-day items, then the hours with timed events.
// Tapping an empty spot starts a new event at that time.
export default function TimeGrid({ days, items, settings, typeF, now, width, height, onOpen, onCreate, onTick }: { days: string[]; items: Item[]; settings: Settings; typeF: TypeFilter; now: number; width: number; height: number; onOpen: (it: Item, occ: string) => void; onCreate: (ds: string, minutes: number) => void; onTick: (it: Item, ds: string) => void }) {
  const { c } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const top0 = settings.dayStart * 60, lim = settings.dayEnd * 60, rows = settings.dayEnd - settings.dayStart;
  const todayS = ymd(new Date(now)), colW = (width - GUTTER) / days.length;

  const perDay = useMemo(() => days.map((ds) => {
    const timed: Array<{ it: Item; sg: NonNullable<ReturnType<typeof segment>>; s: number; e: number }> = [], due: Item[] = [];
    for (const it of items) {
      if (!matchesFilter(it, typeF) || !showsOn(it, ds)) continue;
      if (it.type === 'event' && it.time) {
        const sg = segment(it, ds, top0, lim)!, e = sg.first && sg.last ? Math.max(sg.start + 15, sg.end) : sg.end;
        if (e <= top0 || sg.start >= lim) due.push(it); else timed.push({ it, sg, s: Math.max(sg.start, top0), e: Math.min(e, lim) });
      } else due.push(it);
    }
    due.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    return { ds, due, timed: lanes(timed) };
  }), [days, items, typeF, top0, lim]);

  // Open at the current hour (or the start of the day when today is not shown).
  useEffect(() => {
    const m = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    const y = days.includes(todayS) ? Math.max(0, ((m - top0) / 60) * HH - height * 0.4) : 0;
    const t = setTimeout(() => scroller.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join(','), height]);

  const line = { borderLeftWidth: 1, borderLeftColor: c.line };
  return (
    <View style={{ height, backgroundColor: c.card }}>
      {/* day heads */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line }}>
        <View style={{ width: GUTTER }} />
        {perDay.map(({ ds }) => {
          const d = new Date(`${ds}T00:00:00`), today = ds === todayS;
          return (
            <View key={ds} style={[line, { width: colW, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 6 }]}>
              <Txt style={{ fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.77, textTransform: 'uppercase', color: today ? c.b : c.muted }}>{DOW[d.getDay()]}</Txt>
              <View style={{ minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? c.b : 'transparent' }}>
                <Txt style={{ fontSize: 15, lineHeight: 18, fontWeight: '700', color: today ? c.onB : c.ink }}>{d.getDate()}</Txt>
              </View>
            </View>
          );
        })}
      </View>
      {/* deadlines and all-day items */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: c.line, backgroundColor: mix(c.soft, c.card, 0.6) }}>
        <View style={{ width: GUTTER, alignItems: 'center', paddingTop: 9 }}><Txt style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '800', letterSpacing: 0.84, color: c.muted }}>DUE</Txt></View>
        {perDay.map(({ ds, due }) => (
          <View key={ds} style={[line, { width: colW, minHeight: 34, gap: 3, padding: 4 }]}>
            {due.map((it) => <ItemChip key={`${it.id}|${ds}`} it={it} ds={ds} settings={settings} now={now} onOpen={() => onOpen(it, occOf(it, ds))} onTick={() => onTick(it, ds)} />)}
          </View>
        ))}
      </View>
      {/* the hours */}
      <ScrollView ref={scroller} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', height: rows * HH }}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: rows }, (_, i) => <Txt key={i} style={{ position: 'absolute', right: 4, top: i * HH + (i ? -7 : 2), fontSize: 10, lineHeight: 14, fontWeight: '600', color: c.muted, backgroundColor: c.card, paddingHorizontal: 2 }}>{settings.dayStart + i}:00</Txt>)}
          </View>
          {perDay.map(({ ds, timed }) => {
            const today = ds === todayS, nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
            return (
              <Pressable key={ds} onPress={(e) => onCreate(ds, Math.max(top0, Math.min(lim - 30, Math.floor(snap15(top0 + (e.nativeEvent.locationY / HH) * 60) / 30) * 30)))} accessibilityLabel={`New event on ${ds}`} style={[line, { width: colW, height: rows * HH, backgroundColor: today ? mix(c.b, c.card, 0.04) : c.card }]}>
                {Array.from({ length: rows }, (_, i) => <View key={i} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * HH - 1, height: 1, backgroundColor: c.line }} />)}
                {timed.map((ev) => {
                  const w = (colW - 3) / ev.n, sg = ev.sg;
                  const label = sg.first && sg.last ? `${ev.it.time}${ev.it.endTime ? ' to ' + ev.it.endTime : ''}` : sg.first ? `${ev.it.time} and on` : sg.last ? `until ${ev.it.endTime || 'the evening'}` : 'All day';
                  return <EventBlock key={`${ev.it.id}|${ds}`} it={ev.it} label={label} color={colorOf(settings, ev.it.category, c.b)} top={((ev.s - top0) / 60) * HH} height={Math.max(26, ((ev.e - ev.s) / 60) * HH - 2)} left={ev.lane * w + 1} width={w - 1} first={sg.first} last={sg.last} onOpen={() => onOpen(ev.it, sg.occ)} />;
                })}
                {today && nowMin >= top0 && nowMin <= lim ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ((nowMin - top0) / 60) * HH, height: 0, borderTopWidth: 2, borderTopColor: '#e5484d' }}><View style={{ position: 'absolute', left: -1, top: -5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5484d' }} /></View> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
void hhmm; void pad;
