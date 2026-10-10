import { View } from 'react-native';
import { EVERY } from '../lib/selectors';
import { useTheme } from '../lib/theme-context';
import type { Nudge } from '../lib/types';
import { Btn, IBtn, Select, Txt } from './ui';

export const REM: Array<[number, string]> = [[0, 'At time'], [5, '5 min'], [10, '10 min'], [30, '30 min'], [60, '1 hour'], [180, '3 hours'], [720, '12 hours'], [1440, '1 day'], [2880, '2 days'], [4320, '3 days'], [10080, '1 week']];
export const FROM: Array<[number | 'day', string]> = [[525600, 'Right away'], [10080, '7 days before'], [4320, '3 days before'], [2880, '2 days before'], [1440, '1 day before'], ['day', 'From the start of the due day'], [720, '12 hours before'], [360, '6 hours before'], [180, '3 hours before'], [60, '1 hour before'], [30, '30 min before']];
const rank = (r: Nudge) => (r.from === 'day' ? 1200 : +r.from);

// "Keep reminding me until it is done": rules of "from X, every N minutes", earliest start first.
export default function NudgeEditor({ rules, onChange }: { rules: Nudge[]; onChange: (r: Nudge[]) => void }) {
  const { c } = useTheme();
  const sorted = [...rules].sort((a, b) => rank(b) - rank(a));
  const set = (i: number, patch: Partial<Nudge>) => onChange(sorted.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <View style={{ gap: 8 }}>
      {sorted.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flex: 3 }}><Select label="Start" value={String(r.from)} onChange={(v) => set(i, { from: v === 'day' ? 'day' : +v })} options={FROM.map(([v, l]) => ({ id: String(v), label: l }))} /></View>
          <Txt style={{ color: c.muted }}>every</Txt>
          <View style={{ flex: 2 }}><Select label="Interval" value={String(r.every)} onChange={(v) => set(i, { every: +v })} options={(EVERY.some(([v]) => v === +r.every) ? EVERY : [...EVERY, [+r.every, `${r.every} min`] as [number, string]]).map(([v, l]) => ({ id: String(v), label: l }))} /></View>
          <IBtn icon="x" label="Remove" size={14} onPress={() => onChange(sorted.filter((_, j) => j !== i))} />
        </View>
      ))}
      <Btn variant="ghost" small onPress={() => onChange([...rules, { from: 525600, every: 30 }])}>+ Add a repeating reminder</Btn>
    </View>
  );
}
