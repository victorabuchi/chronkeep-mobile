import { Pressable, View } from 'react-native';
import { dayHeads, monthWeeks } from '../../lib/calendar-layout';
import { ymd } from '../../lib/recur';
import { matchesFilter, showsOn } from '../../lib/selectors';
import { mix } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import type { TypeFilter } from '../../lib/ui-state';
import { Txt } from '../ui';
import DueStrip from './DueStrip';

// The month: weeks of days, each with up to three chips and "+N more". Tapping a day opens it in the day view.
export default function MonthGrid({ cur, items, settings, typeF, now, onOpen, onDay, onTick, onDue }: { cur: string; items: Item[]; settings: Settings; typeF: TypeFilter; now: number; onOpen: (it: Item, occ: string) => void; onDay: (ds: string) => void; onTick: (it: Item, ds: string) => void; onDue: (ds: string) => void }) {
  const { c } = useTheme();
  const weeks = monthWeeks(cur, settings), month = new Date(`${cur}T00:00:00`).getMonth(), todayS = ymd(new Date(now));
  return (
    <View style={{ backgroundColor: c.card }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.line }}>
        {dayHeads(settings).map((h, i) => <View key={i} style={{ flex: 1, paddingVertical: 8, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line }}><Txt style={{ textAlign: 'center', fontSize: 10, lineHeight: 13, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: c.muted }}>{h}</Txt></View>)}
      </View>
      {weeks.map((w, wi) => (
        <View key={wi} style={{ flexDirection: 'row', minHeight: 92, borderBottomWidth: wi < weeks.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
          {w.map((ds, i) => {
            const list = items.filter((it) => matchesFilter(it, typeF) && showsOn(it, ds)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
            const today = ds === todayS, other = new Date(`${ds}T00:00:00`).getMonth() !== month;
            return (
              <Pressable key={ds} onPress={() => onDay(ds)} accessibilityLabel={ds} style={{ flex: 1, gap: 3, padding: 3, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.line, backgroundColor: today ? mix(c.b, c.card, 0.04) : c.card }}>
                <View style={{ alignSelf: 'flex-end', minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? c.b : 'transparent' }}>
                  <Txt style={{ fontSize: 12, lineHeight: 15, fontWeight: '700', color: today ? c.onB : c.ink, opacity: other && !today ? 0.4 : 1 }}>{new Date(`${ds}T00:00:00`).getDate()}</Txt>
                </View>
                <DueStrip list={list} ds={ds} settings={settings} now={now} month onOpen={onOpen} onTick={onTick} onMore={onDue} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
