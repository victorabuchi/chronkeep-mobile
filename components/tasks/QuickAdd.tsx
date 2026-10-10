import { useState } from 'react';
import { View } from 'react-native';
import { addDays } from '../../lib/recur';
import { addItem } from '../../lib/commands';
import { fmtDay } from '../../lib/dates';
import { describe, parseQuick } from '../../lib/quick';
import { useTheme } from '../../lib/theme-context';
import type { Item, Settings } from '../../lib/types';
import { DateField, TimeField } from '../forms';
import { Btn, Card, Input, Select, Txt, useToast } from '../ui';
import * as commands from '../../lib/commands';
import { setUI } from '../../lib/ui-state';

type Fallback = { type?: Item['type']; date?: string; time?: string; category?: string };

// Reads a typed sentence into an item, with the reminders you usually want ("Robotics report due Sunday 11pm").
export function fromText(text: string, s: Settings, fb: Fallback = {}): Partial<Item> & { _found: string[]; _label: string } {
  const p = parseQuick(text, { categories: s.categories });
  const type = p.type || fb.type || 'todo', date = p.date || fb.date || '';
  const body = { type, title: p.title || text.trim(), date, time: p.time || fb.time || (type === 'assignment' && date ? s.dueTime : ''), category: p.category || fb.category || '', repeat: (p.repeat || 'none') as Item['repeat'], reminders: date ? [...(s.reminderDefaults[type] || [])] : [], nudges: date ? (s.nudgeDefaults[type] || []).map((r) => ({ ...r })) : [] };
  return { ...body, _found: p.found, _label: describe({ type: body.type, date: body.date, time: body.time, repeat: body.repeat === 'none' ? '' : body.repeat, category: body.category }) };
}

export default function QuickAdd({ settings }: { settings: Settings }) {
  const { c } = useTheme();
  const toast = useToast();
  const [text, setText] = useState(''), [type, setType] = useState<'assignment' | 'todo'>('assignment'), [date, setDate] = useState(''), [time, setTime] = useState('');
  const fb: Fallback = { type, date, time };
  const prev = text.trim() ? fromText(text, settings, fb) : null;
  const submit = () => {
    if (!text.trim()) return;
    const { _found, _label, ...body } = fromText(text, settings, fb);
    void _found; void _label;
    const it = addItem(body);
    if (!it) return;
    if (it.date) setUI({ cur: it.date });
    toast.show(`Added "${it.title}"${it.date ? ` for ${fmtDay(it.date)}${it.time ? ' at ' + it.time : ''}` : ''}`, { action: 'Undo', onAction: () => commands.purgeItem(it.id) });
    setText(''); setDate(''); setTime('');
  };
  void addDays;
  return (
    <Card style={{ gap: 8, padding: 10 }}>
      <Input value={text} onChangeText={setText} placeholder="Try: Robotics report due Sunday 11pm" returnKeyType="done" onSubmitEditing={submit} autoCorrect={false} />
      {prev && prev._found.length ? <Txt style={{ fontSize: 12, color: c.b, fontWeight: '600' }}>Reads as {prev._label}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1 }}><Select value={type} onChange={(v) => setType(v as 'assignment' | 'todo')} label="Type" options={[{ id: 'assignment', label: 'Assignment' }, { id: 'todo', label: 'To-do' }]} /></View>
        <View style={{ flex: 1 }}><DateField value={date} onChange={setDate} placeholder="Date" clearable /></View>
        <View style={{ flex: 1 }}><TimeField value={time} onChange={setTime} placeholder="Time" clearable /></View>
      </View>
      <Btn onPress={submit} disabled={!text.trim()}>Add</Btn>
    </Card>
  );
}
