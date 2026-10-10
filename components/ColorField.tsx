import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { hexOf } from '../lib/hex';
import { useTheme } from '../lib/theme-context';
import { Input } from './ui';

// A colour as a hex code with its swatch. A valid code takes effect at once; leaving the field fixes a bad one.
export default function ColorField({ value, onChange, width }: { value: string; onChange: (hex: string) => void; width?: number }) {
  const { c } = useTheme();
  const [text, setText] = useState(value), [bad, setBad] = useState(false);
  useEffect(() => { setText(value); setBad(false); }, [value]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width }}>
      <View style={{ width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: c.line2, backgroundColor: hexOf(text) ?? value }} />
      <View style={{ flex: 1 }}>
        <Input value={text} maxLength={7} autoCapitalize="none" autoCorrect={false} spellCheck={false} placeholder="#3b5bdb" accessibilityLabel="Hex colour" style={bad ? { borderColor: c.neg } : undefined}
          onChangeText={(v) => { setText(v); const h = hexOf(v); setBad(!h && v.trim() !== ''); if (h) onChange(h); }}
          onBlur={() => { setText(hexOf(text) ?? value); setBad(false); }} />
      </View>
    </View>
  );
}
