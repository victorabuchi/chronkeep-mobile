import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { onBurst } from '../lib/burst';
import { useTheme } from '../lib/theme-context';

// Draws the burst over everything: twelve dots flying out from the tick and fading.
export default function BurstLayer() {
  const { c } = useTheme();
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const seq = useRef(0);
  useEffect(() => onBurst((x, y) => { const id = ++seq.current; setBursts((b) => [...b, { id, x, y }]); setTimeout(() => setBursts((b) => b.filter((z) => z.id !== id)), 900); }), []);
  const colors = [c.b, '#f5b400', '#16a36a', '#d6457a', '#0e8fb0'];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 300 }}>
      {bursts.map((b) => <Particles key={b.id} x={b.x} y={b.y} colors={colors} />)}
    </View>
  );
}

function Particles({ x, y, colors }: { x: number; y: number; colors: string[] }) {
  const t = useRef(new Animated.Value(0)).current;
  const dots = useRef(Array.from({ length: 12 }, (_, i) => ({ a: (Math.PI * 2 * i) / 12 + Math.random() * 0.5, d: 24 + Math.random() * 30 }))).current;
  useEffect(() => { Animated.timing(t, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [t]);
  return (
    <>
      {dots.map((p, i) => (
        <Animated.View key={i} style={{ position: 'absolute', left: x - 3.5, top: y - 3.5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors[i % colors.length], opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }), transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) }] }} />
      ))}
    </>
  );
}
