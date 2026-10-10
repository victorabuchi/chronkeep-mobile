import { Image } from 'react-native';

// The ChronKeep logo: the green "C" tile.
export default function Mark({ size = 32 }: { size?: number }) {
  return <Image source={require('../assets/mark.png')} style={{ width: size, height: size, borderRadius: size * 0.28 }} accessibilityLabel="ChronKeep" />;
}
