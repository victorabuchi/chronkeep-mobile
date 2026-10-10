import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { fireBurst } from '../lib/burst';
import { done as doneBuzz } from '../lib/haptics';
import { useTheme } from '../lib/theme-context';
import I from './Icon';

// The round tick: a task's circle (19px, accent when done) or a calendar chip's small one (15px, in the course colour).
// It pops when it turns on, and bursts colour from where it was pressed.
export default function Tick({ done, onPress, size = 19, color, label = 'Tick off', burst = true }: { done: boolean; onPress: () => void; size?: number; color?: string; label?: string; burst?: boolean }) {
  const { c } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const was = useRef(done);
  const box = useRef<View>(null);
  useEffect(() => {
    if (done && !was.current) Animated.sequence([Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }), Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true })]).start();
    was.current = done;
  }, [done, scale]);
  const tone = color ?? c.b;
  return (
    <Pressable
      hitSlop={10}
      onPress={() => {
        if (!done) {
          doneBuzz();
          if (burst) box.current?.measureInWindow((x, y, w, h) => fireBurst(x + w / 2, y + h / 2));
        }
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
    >
      <Animated.View ref={box} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: done ? tone : color ?? c.line2, backgroundColor: done ? tone : 'transparent', alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
        {done ? <I d="check" size={size * 0.62} stroke={3.2} color={color ? '#fff' : c.onB} /> : null}
      </Animated.View>
    </Pressable>
  );
}
