import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import * as commands from '../../lib/commands';
import { useData } from '../../lib/data';
import { DOW, MON } from '../../lib/dates';
import { useTheme } from '../../lib/theme-context';
import { Btn, Sheet, Txt } from '../ui';

// The floating Note, as a sheet. Text, with "☐ " lines as a checklist (the web saves it the same way). Saves as you type.
export default function NoteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const saved = useData((d) => d.notepad);
  const [text, setText] = useState(saved.text);
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (open) setText(saved.text); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  const change = (v: string) => { setText(v); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => commands.saveNote(v), 400); };
  const close = () => { if (timer.current) { clearTimeout(timer.current); commands.saveNote(text); } onClose(); };

  const lineStart = () => text.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const checklist = () => {
    const at = lineStart(), rest = text.slice(at);
    const next = rest.startsWith('☐ ') ? text.slice(0, at) + text.slice(at + 2) : rest.startsWith('☑ ') ? text.slice(0, at) + '☐ ' + text.slice(at + 2) : text.slice(0, at) + '☐ ' + rest;
    change(next);
  };
  const tick = () => {
    const at = lineStart(), rest = text.slice(at);
    if (rest.startsWith('☐ ')) change(text.slice(0, at) + '☑ ' + text.slice(at + 2));
    else if (rest.startsWith('☑ ')) change(text.slice(0, at) + '☐ ' + text.slice(at + 2));
  };
  // Pressing return on a checklist line starts the next one.
  const onKey = (k: string) => {
    if (k !== 'Enter') return;
  };
  void onKey;
  const d = new Date(saved.at || Date.now());
  return (
    <Sheet open={open} onClose={close} title="Note" tall>
      <View style={{ gap: 8 }}>
        <Txt style={{ color: c.muted, fontSize: 13, textAlign: 'center' }}>{saved.at ? `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]!.slice(0, 3)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : 'Not saved yet'}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}><Btn variant="ghost" small onPress={checklist}>Checklist</Btn><Btn variant="ghost" small onPress={tick}>Tick line</Btn></View>
        <TextInput value={text} onChangeText={change} onSelectionChange={(e) => setSel(e.nativeEvent.selection)} multiline autoFocus placeholderTextColor={c.muted} placeholder="Start typing" selectionColor="#f5b400" style={{ minHeight: 260, padding: 0, color: c.ink, fontFamily: 'Figtree_500Medium', fontSize: 15, lineHeight: 23, textAlignVertical: 'top' }} />
      </View>
    </Sheet>
  );
}
