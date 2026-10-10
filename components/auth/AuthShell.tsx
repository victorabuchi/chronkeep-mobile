import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import I from '../Icon';
import Mark from '../Mark';
import { Txt } from '../ui';

// The sign-in screens, drawn like the web's sign-in pages: a dark hero with the logo and a heading, one white card.
// They do not follow the light or dark theme (the web's do not either).
const INK = '#14181f', MUTED = '#5d6673', LINE = '#e3e7ec', BRAND = '#3b5bdb', DANGER = '#c92a2a';
const t = (extra: object = {}) => ({ color: INK, ...extra });

export function AuthShell({ title, lede, below, children }: { title: string; lede?: string; below?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#070b1a' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -140, left: -120, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(59, 91, 219, 0.45)', opacity: 0.55 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -140, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(124, 92, 240, 0.28)', opacity: 0.5 }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ alignItems: 'center', gap: 22, paddingHorizontal: 16, paddingTop: Math.max(insets.top, 24) + 28, paddingBottom: insets.bottom + 28 }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Mark size={36} />
            <Txt style={{ color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.44 }}>ChronKeep</Txt>
          </View>
          <Txt style={{ color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.84, marginTop: 6, textAlign: 'center' }}>{title}</Txt>
          {lede ? <Txt style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', maxWidth: 320 }}>{lede}</Txt> : null}
        </View>
        <View style={{ width: '100%', maxWidth: 420, gap: 14, padding: 22, borderRadius: 18, backgroundColor: '#fff' }}>{children}</View>
        {below}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthInput({ label, hint, secure, ...props }: TextInputProps & { label: string; hint?: string; secure?: boolean }) {
  const [focus, setFocus] = useState(false), [show, setShow] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Txt style={t({ fontWeight: '600', fontSize: 14 })}>{label}</Txt>
      <View>
        <TextInput {...props} secureTextEntry={secure && !show} onFocus={(e) => { setFocus(true); props.onFocus?.(e); }} onBlur={(e) => { setFocus(false); props.onBlur?.(e); }} placeholderTextColor="#9aa3ae" accessibilityLabel={label}
          style={{ minHeight: 48, paddingHorizontal: 12, paddingRight: secure ? 48 : 12, borderWidth: 1, borderRadius: 10, borderColor: focus ? BRAND : LINE, backgroundColor: '#fff', color: INK, fontFamily: 'Figtree_500Medium', fontSize: 16 }} />
        {secure ? (
          <Pressable onPress={() => setShow((v) => !v)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 4, top: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <I d="eye" size={18} color={show ? BRAND : MUTED} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Txt style={{ color: MUTED, fontSize: 13 }}>{hint}</Txt> : null}
    </View>
  );
}

export function AuthButton({ children, onPress, busy, variant = 'primary', disabled }: { children: ReactNode; onPress: () => void; busy?: boolean; variant?: 'primary' | 'google' | 'apple'; disabled?: boolean }) {
  const look = variant === 'primary' ? { bg: BRAND, border: BRAND, fg: '#fff' } : variant === 'apple' ? { bg: '#000', border: '#000', fg: '#fff' } : { bg: '#fff', border: LINE, fg: INK };
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: look.border, backgroundColor: look.bg, opacity: busy || disabled ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {busy ? <ActivityIndicator color={look.fg} /> : <Txt style={{ color: look.fg, fontWeight: '700', fontSize: 16 }}>{children}</Txt>}
    </Pressable>
  );
}

export const AuthError = ({ children }: { children: ReactNode }) => (
  <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#fff0f0' }}><Txt style={{ color: DANGER, fontWeight: '600' }}>{children}</Txt></View>
);
export const AuthDivider = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, height: 1, backgroundColor: LINE }} /><Txt style={{ color: MUTED, fontSize: 13 }}>or</Txt><View style={{ flex: 1, height: 1, backgroundColor: LINE }} /></View>
);
export const authLink = { color: '#fff', fontWeight: '700' as const, textDecorationLine: 'underline' as const };
