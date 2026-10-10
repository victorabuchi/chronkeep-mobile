import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';
import { Txt } from './ui';

// A menu that drops from the top-right corner, under the buttons, like the web's account menu and bell popup.
// It opens with a quick scale and fade from that corner; a tap anywhere else closes it.
export const TOP_BAR = 56;

export default function Popover({ open, onClose, width = 288, maxHeight, children }: { open: boolean; onClose: () => void; width?: number; maxHeight?: number; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets(), screen = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) Animated.timing(t, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else t.setValue(0);
  }, [open, t]);
  const w = Math.min(width, screen.width - 20), top = insets.top + TOP_BAR - 2;
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        style={{
          position: 'absolute', top, right: 10, width: w, maxHeight: maxHeight ?? screen.height - top - 90,
          borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card, overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12,
          opacity: t, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [w * 0.06, 0] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        }}
      >
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}

// One row of a menu: an icon and a label.
export function MenuItem({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { c } = useTheme();
  const tone = danger ? c.neg : c.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingHorizontal: 16, backgroundColor: pressed ? c.soft : 'transparent' })}>
      <I d={icon} size={17} color={danger ? c.neg : c.muted} />
      <Txt style={{ flex: 1, fontWeight: '600', color: tone }}>{label}</Txt>
    </Pressable>
  );
}

// The name and email at the top of a menu.
export function MenuHead({ title, subtitle }: { title: string; subtitle?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Txt style={{ fontWeight: '800', fontSize: 15 }}>{title}</Txt>
      {subtitle ? <Txt style={{ color: c.muted, fontSize: 12.5 }}>{subtitle}</Txt> : null}
    </View>
  );
}
