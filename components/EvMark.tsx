import { View } from 'react-native';
import { alpha } from '../lib/theme';
import I from './Icon';

// The small coloured square on the left of history and bin rows (.evmark).
export default function EvMark({ color, icon }: { color: string; icon: 'cal' | 'check' | 'dot' }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(color, 0.15) }}>
      {icon === 'dot' ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} /> : <I d={icon} size={13} stroke={2.4} color={color} />}
    </View>
  );
}
