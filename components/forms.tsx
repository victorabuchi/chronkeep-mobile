import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { fmtDay, pad } from '../lib/dates';
import { tap } from '../lib/haptics';
import { useTheme } from '../lib/theme-context';
import I from './Icon';
import { Btn, Sheet, Txt } from './ui';

// The form pieces the web gets from the browser: a date field and a time field.

const toDate = (ds: string) => { const [y = 2026, m = 1, d = 1] = ds.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const box = (c: { line: string; card: string }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 38, borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card } as const);

// <input type="date">: a day as YYYY-MM-DD, empty when unset.
export function DateField({ value, onChange, label, placeholder = 'Pick a date', clearable }: { value: string; onChange: (day: string) => void; label?: string; placeholder?: string; clearable?: boolean }) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || toDay(new Date()));
  const start = () => {
    tap();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: toDate(value || toDay(new Date())), mode: 'date', onChange: (e, d) => e.type === 'set' && d && onChange(toDay(d)) });
    else { setDraft(value || toDay(new Date())); setOpen(true); }
  };
  return (
    <>
      <View style={box(c)}>
        <Pressable onPress={start} accessibilityRole="button" accessibilityLabel={label ?? 'Date'} style={{ flex: 1, minHeight: 38, justifyContent: 'center', paddingHorizontal: 11 }}>
          <Txt style={{ fontWeight: '500', color: value ? c.ink : c.muted }}>{value ? `${fmtDay(value)} ${value.slice(0, 4)}` : placeholder}</Txt>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Clear date" hitSlop={8} style={{ paddingHorizontal: 10 }}>
            <I d="x" size={14} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Pick a date'} footer={<><Btn variant="ghost" onPress={() => setOpen(false)}>Cancel</Btn><Btn style={{ flex: 1 }} onPress={() => { onChange(draft); setOpen(false); }}>Done</Btn></>}>
        <DateTimePicker value={toDate(draft)} mode="date" display="inline" themeVariant={dark ? 'dark' : 'light'} accentColor={c.b} onChange={(_, d) => d && setDraft(toDay(d))} />
      </Sheet>
    </>
  );
}

// <input type="time">: HH:MM, empty when unset.
export function TimeField({ value, onChange, label, placeholder = 'Pick a time', clearable }: { value: string; onChange: (t: string) => void; label?: string; placeholder?: string; clearable?: boolean }) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const asDate = (t: string) => { const [h = 9, m = 0] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  const [draft, setDraft] = useState(value || '09:00');
  const start = () => {
    tap();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: asDate(value || '09:00'), mode: 'time', is24Hour: true, onChange: (e, d) => e.type === 'set' && d && onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`) });
    else { setDraft(value || '09:00'); setOpen(true); }
  };
  return (
    <>
      <View style={box(c)}>
        <Pressable onPress={start} accessibilityRole="button" accessibilityLabel={label ?? 'Time'} style={{ flex: 1, minHeight: 38, justifyContent: 'center', paddingHorizontal: 11 }}>
          <Txt style={{ fontWeight: '500', color: value ? c.ink : c.muted }}>{value || placeholder}</Txt>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Clear time" hitSlop={8} style={{ paddingHorizontal: 10 }}>
            <I d="x" size={14} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Pick a time'} footer={<><Btn variant="ghost" onPress={() => setOpen(false)}>Cancel</Btn><Btn style={{ flex: 1 }} onPress={() => { onChange(draft); setOpen(false); }}>Done</Btn></>}>
        <DateTimePicker value={asDate(draft)} mode="time" display="spinner" is24Hour themeVariant={dark ? 'dark' : 'light'} onChange={(_, d) => d && setDraft(`${pad(d.getHours())}:${pad(d.getMinutes())}`)} />
      </Sheet>
    </>
  );
}
