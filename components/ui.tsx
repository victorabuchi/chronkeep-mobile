import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { soft, tap } from '../lib/haptics';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';

// The app's building blocks, after the web's app.css: text, cards, buttons, segments, inputs, sheets, toasts.

const FAMILY: Record<string, string> = { '400': 'Figtree_400Regular', '500': 'Figtree_500Medium', '600': 'Figtree_600SemiBold', '700': 'Figtree_700Bold', '800': 'Figtree_800ExtraBold', normal: 'Figtree_400Regular', bold: 'Figtree_700Bold' };

// Text in Figtree at the app's base size (14 / 1.4). Weights map to the font files.
export function Txt({ style, ...props }: TextProps) {
  const { c } = useTheme();
  const flat = { ...(StyleSheet.flatten(style) as TextStyle | undefined) };
  const weight = String(flat.fontWeight ?? '400');
  delete flat.fontWeight;
  return <Text {...props} style={[{ color: c.ink, fontSize: 14, lineHeight: 19.6, fontFamily: FAMILY[weight] ?? FAMILY['400'] }, flat]} />;
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[{ gap: 12, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card }, style]}>{children}</View>;
}

export const CardTitle = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Txt style={[{ fontSize: 15, fontWeight: '800', letterSpacing: -0.15 }, style]}>{children}</Txt>;

export function Note({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Txt style={[{ color: c.muted, fontSize: 13 }, style]}>{children}</Txt>;
}

// The label above a field: 12px, bold, muted.
export function Label({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '700', marginBottom: 5 }}>{children}</Txt>;
}

type BtnProps = { children: ReactNode; onPress?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'solidDanger'; small?: boolean; busy?: boolean; disabled?: boolean; label?: string; style?: StyleProp<ViewStyle>; haptic?: boolean };

// .btn / .btn.ghost / .btn.danger: 36 high, 9 radius, bold. Presses down softly.
export function Btn({ children, onPress, variant = 'primary', small, busy, disabled, label, style, haptic = true }: BtnProps) {
  const { c } = useTheme();
  const tone = variant === 'primary' ? { bg: c.b, border: c.b, fg: c.onB } : variant === 'solidDanger' ? { bg: c.neg, border: c.neg, fg: '#fff' } : variant === 'danger' ? { bg: c.card, border: c.negLine, fg: c.neg } : { bg: c.card, border: c.line, fg: c.ink };
  return (
    <Pressable
      onPress={() => { if (haptic) soft(); onPress?.(); }}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: small ? 32 : 36, paddingHorizontal: small ? 11 : 14, borderRadius: 9, borderWidth: 1, backgroundColor: tone.bg, borderColor: tone.border, opacity: busy || disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }, style]}
    >
      {typeof children === 'string' ? <Txt style={{ color: tone.fg, fontWeight: '700', fontSize: small ? 13 : 14 }}>{children}</Txt> : children}
    </Pressable>
  );
}

export const LinkBtn = ({ children, onPress, color }: { children: ReactNode; onPress?: () => void; color?: string }) => {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <Txt style={{ color: color ?? c.b, fontWeight: '700', fontSize: 12.5 }}>{children}</Txt>
    </Pressable>
  );
};

// A square 36px icon button with a hairline border (.ibtn).
export function IBtn({ icon, onPress, label, on, size = 17, badge, style }: { icon: IconName; onPress: () => void; label: string; on?: boolean; size?: number; badge?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} style={({ pressed }) => [{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9, borderColor: on ? c.b : c.line, backgroundColor: on ? c.bt : c.card, transform: [{ scale: pressed ? 0.93 : 1 }] }, style]}>
      <I d={icon} size={size} color={on ? c.b : c.muted} />
      {badge ? (
        <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: c.neg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.card }}>
          <Txt style={{ color: '#fff', fontSize: 10.5, lineHeight: 12, fontWeight: '800' }}>{badge}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

// .segment: choices in a rounded tray. `wide` spreads them across the width.
export function Segment<T extends string>({ options, value, onChange, wide }: { options: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void; wide?: boolean }) {
  const { c } = useTheme();
  const row = (
    <View style={[{ flexDirection: 'row', gap: 2, padding: 3, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }, wide && { alignSelf: 'stretch' }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => { tap(); onChange(o.id); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={[{ paddingVertical: wide ? 8 : 6, paddingHorizontal: 12, borderRadius: 7, backgroundColor: on ? c.bt : 'transparent', alignItems: 'center', justifyContent: 'center' }, wide && { flex: 1 }]}>
            <Txt style={{ fontWeight: '700', color: on ? c.b : c.muted }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
  return wide ? row : <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>{row}</ScrollView>;
}

// An input (38 high, 9 radius, accent ring when focused).
export function Input({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return <TextInput placeholderTextColor={c.muted} {...props} onFocus={(e) => { setFocus(true); onFocus?.(e); }} onBlur={(e) => { setFocus(false); onBlur?.(e); }} style={[{ minHeight: 38, paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: focus ? c.b : c.line, borderRadius: 9, backgroundColor: c.card, color: c.ink, fontSize: 14, fontFamily: FAMILY['500'] }, style]} />;
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 0 }}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {hint ? <Txt style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>{hint}</Txt> : null}
    </View>
  );
}

// A choice from a short list, in a sheet (the web's <select>).
export function Select({ value, options, onChange, label, placeholder, disabled }: { value: string; options: Array<{ id: string; label: string }>; onChange: (id: string) => void; label?: string; placeholder?: string; disabled?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <>
      <Pressable onPress={() => { tap(); setOpen(true); }} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card, opacity: disabled ? 0.5 : 1 }}>
        <Txt style={{ fontWeight: '500', color: current ? c.ink : c.muted, flexShrink: 1 }} numberOfLines={1}>{current?.label ?? placeholder ?? ''}</Txt>
        <I d="down" size={15} color={c.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Choose'}>
        {options.map((o) => (
          <Pressable key={o.id} onPress={() => { tap(); onChange(o.id); setOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, backgroundColor: o.id === value ? c.bt : 'transparent' }}>
            <Txt style={{ fontWeight: o.id === value ? '700' : '500', color: o.id === value ? c.b : c.ink }}>{o.label}</Txt>
            {o.id === value ? <I d="check" size={16} color={c.b} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

// A small round choice: reminders chips (12.5px, 8 radius).
export function Chip({ children, on, onPress }: { children: ReactNode; on?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} style={({ pressed }) => ({ paddingVertical: 5, paddingHorizontal: 11, borderWidth: 1, borderRadius: 8, borderColor: on ? c.b : c.line, backgroundColor: on ? c.bt : c.card, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Txt style={{ fontSize: 12.5, fontWeight: '600', color: on ? c.b : c.ink2 }}>{children}</Txt>
    </Pressable>
  );
}

// A checkbox with its sentence (.chk).
export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => { tap(); onChange(!checked); }} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: checked ? c.b : c.line2, backgroundColor: checked ? c.b : c.card, alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <I d="check" size={12} stroke={3} color={c.onB} /> : null}
      </View>
      <Txt style={{ flex: 1, fontWeight: '600' }}>{children}</Txt>
    </Pressable>
  );
}

// Sheets slide up from the bottom, like the web's phone layout (a dialog there).
const CloseContext = createContext<() => void>(() => {});
export const useCloseSheet = () => useContext(CloseContext);

export function Sheet({ open, onClose, title, children, footer, tall }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(11, 15, 20, 0.4)' }]} />
        <View style={{ maxHeight: tall ? '94%' : '90%', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderBottomWidth: 0, borderColor: c.line, backgroundColor: c.card }}>
          <CloseContext.Provider value={onClose}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.line2, marginTop: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
              <Txt style={{ flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.18 }}>{title}</Txt>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <I d="x" size={16} color={c.muted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 4, paddingHorizontal: 20, paddingTop: 4, paddingBottom: (footer ? 8 : 20) + (footer ? 0 : insets.bottom) }}>{children}</ScrollView>
            {footer ? <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderTopColor: c.line }}>{footer}</View> : null}
          </CloseContext.Provider>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// A page head: the small blue label above the title (.eyebrow + h1).
export function PageHead({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Txt style={{ color: c.b, fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.88, textTransform: 'uppercase' }}>{eyebrow}</Txt>
        <Txt accessibilityRole="header" style={{ fontSize: 22, lineHeight: 26, fontWeight: '800', letterSpacing: -0.44 }}>{title}</Txt>
      </View>
      {right}
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 26, borderWidth: 1, borderRadius: 14, borderColor: c.line, backgroundColor: c.card }}>
      <Txt style={{ color: c.muted, textAlign: 'center' }}>{children}</Txt>
    </View>
  );
}

// The "N group" label: 11px, uppercase, muted.
export function GroupLabel({ children, count, red }: { children: ReactNode; count?: number; red?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 3, paddingHorizontal: 10 }}>
      <Txt style={{ color: red ? c.neg : c.muted, fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.88, textTransform: 'uppercase' }}>{children}</Txt>
      {count !== undefined ? <Txt style={{ color: red ? c.neg : c.muted, fontSize: 11, lineHeight: 14, fontWeight: '800' }}>{count}</Txt> : null}
    </View>
  );
}

// Toasts: a dark pill at the foot of the screen, with an Undo when there is one.
export type ToastOptions = { action?: string; onAction?: () => void; error?: boolean };
type ToastValue = { show: (text: string, options?: ToastOptions) => void };
const ToastContext = createContext<ToastValue>({ show: () => undefined });
export const useToast = () => useContext(ToastContext);

type Shown = { text: string; key: number } & ToastOptions;

export function ToastProvider({ children, bottom = 24 }: { children: ReactNode; bottom?: number }) {
  const { c } = useTheme();
  const [shown, setShown] = useState<Shown | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => finished && setShown(null));
  }, [anim]);
  const show = useCallback((text: string, options: ToastOptions = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setShown({ text, key: Date.now(), ...options });
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    timer.current = setTimeout(hide, options.action ? 6000 : options.error ? 5000 : 3200);
  }, [anim, hide]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {shown && (
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom, zIndex: 200, alignItems: 'center', opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
          <Pressable onPress={hide} accessibilityRole={shown.error ? 'alert' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: '100%', paddingVertical: 10, paddingLeft: 16, paddingRight: shown.action ? 10 : 16, borderRadius: 12, backgroundColor: c.ink, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 12 }}>
            <Txt style={{ color: c.bg, fontWeight: '600', flexShrink: 1 }}>{shown.text}</Txt>
            {shown.action ? (
              <Pressable onPress={() => { hide(); shown.onAction?.(); }} accessibilityRole="button" style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(128,128,128,0.28)' }}>
                <Txt style={{ color: c.bg, fontWeight: '800' }}>{shown.action}</Txt>
              </Pressable>
            ) : null}
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}
