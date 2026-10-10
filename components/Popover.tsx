import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';
import { Txt } from './ui';

// A menu that drops from the top-right corner, under the buttons, like the web's account menu and bell popup.
// It opens with a quick scale and fade from that corner; a tap anywhere else closes it.
export const TOP_BAR = 56;

export default function Popover({ open, onClose, width = 300, maxHeight, children }: { open: boolean; onClose: () => void; width?: number; maxHeight?: number; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets(), screen = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) Animated.timing(t, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else t.setValue(0);
  }, [open, t]);
  const w = Math.min(width, screen.width - 24), top = insets.top + TOP_BAR + 4;
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={{
          position: 'absolute', top, right: 12, width: w, maxHeight: maxHeight ?? screen.height - top - 24, padding: 8,
          borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card,
          shadowColor: '#14181f', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 16,
          opacity: t, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [w * 0.06, 0] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}
      >
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}

// One row of a menu: an icon and a label.
export function MenuItem({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  const tone = c.ink; void danger;
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9, backgroundColor: pressed ? c.soft : 'transparent' })}>
      <I d={icon} size={16} color={c.muted} />
      <Txt style={{ flex: 1, color: tone }}>{label}</Txt>
    </Pressable>
  );
}

// The name and email at the top of a menu.
export function MenuHead({ title, subtitle }: { title: string; subtitle?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 10, paddingBottom: 4 }}>
      <Txt style={{ fontWeight: '700' }}>{title}</Txt>
      {subtitle ? <Txt style={{ color: c.muted, fontSize: 12 }}>{subtitle}</Txt> : null}
    </View>
  );
}
