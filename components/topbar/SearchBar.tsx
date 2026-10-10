import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { addItem } from '../../lib/commands';
import { DOW, MON, fmtDay, typeLabel } from '../../lib/dates';
import { useData } from '../../lib/data';
import { day } from '../../lib/recur';
import { colorOf, search } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';
import { openItem, setUI } from '../../lib/ui-state';
import { useRouter } from 'expo-router';
import I from '../Icon';
import { fromText } from '../tasks/QuickAdd';
import { Txt, useToast } from '../ui';
import * as commands from '../../lib/commands';

// Search on any date, with an "Add …" row at the end that reads the text as a new item.
export default function SearchBar({ onFocusChange, autoFocus }: { onFocusChange: (focused: boolean) => void; autoFocus?: boolean }) {
  const { c } = useTheme();
  const router = useRouter(), toast = useToast();
  const settings = useData((d) => d.settings), items = useData((d) => d.items);
  const [q, setQ] = useState(''), [focus, setFocus] = useState(false);
  const raw = q.trim();
  const found = useMemo(() => search(items, q), [items, q]);
  const done = () => { setQ(''); setFocus(false); onFocusChange(false); };
  const pick = (it: (typeof items)[number]) => { done(); if (it.date) setUI({ cur: it.date }); router.navigate('/calendar'); openItem(it); };
  const add = () => {
    if (!raw) return;
    const { _found, _label, ...body } = fromText(raw, settings, { type: 'todo' }); void _found; void _label;
    done();
    const it = addItem(body);
    if (!it) return;
    if (it.date) setUI({ cur: it.date });
    toast.show(`Added "${it.title}"${it.date ? ` for ${fmtDay(it.date)}${it.time ? ' at ' + it.time : ''}` : ''}`, { action: 'Undo', onAction: () => commands.purgeItem(it.id) });
  };
  const label = raw ? fromText(raw, settings, { type: 'todo' })._label : '';
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: focus ? c.b : c.line, borderRadius: 9, backgroundColor: c.card }}>
        <I d="search" size={15} color={c.muted} />
        <TextInput autoFocus={autoFocus} value={q} onChangeText={setQ} onFocus={() => { setFocus(true); onFocusChange(true); }} onBlur={() => setTimeout(() => { setFocus(false); onFocusChange(false); }, 150)} placeholder="Search or add" placeholderTextColor={c.muted} returnKeyType="done" onSubmitEditing={() => (found.length ? pick(found[0]!) : add())} style={{ flex: 1, padding: 0, color: c.ink, fontFamily: 'Figtree_500Medium', fontSize: 14 }} />
      </View>
      {focus && raw ? (
        <View style={{ position: 'absolute', top: 42, left: 0, right: -4, zIndex: 20, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
          {found.map((it) => (
            <Pressable key={it.id} onPress={() => pick(it)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 11, backgroundColor: pressed ? c.soft : 'transparent' })}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorOf(settings, it.category, c.b) }} />
              <View style={{ flex: 1 }}>
                <Txt numberOfLines={1} style={{ fontWeight: '600', textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.title}</Txt>
                <Txt numberOfLines={1} style={{ fontSize: 11.5, color: c.muted }}>{typeLabel(it.type)} · {it.date ? `${DOW[day(it.date).getDay()]} ${day(it.date).getDate()} ${MON[day(it.date).getMonth()]!.slice(0, 3)}${it.time ? ', ' + it.time : ''}` : 'No date'}</Txt>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={add} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 11, borderTopWidth: found.length ? 1 : 0, borderTopColor: c.line, backgroundColor: pressed ? c.soft : c.bt })}>
            <I d="plus" size={14} stroke={2.6} color={c.b} />
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1} style={{ fontWeight: '700', color: c.b }}>Add "{raw}"</Txt>
              {label ? <Txt numberOfLines={1} style={{ fontSize: 11.5, color: c.muted }}>{label}</Txt> : null}
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
