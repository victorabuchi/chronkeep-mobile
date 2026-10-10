import { View } from 'react-native';
import { Btn, Txt } from './ui';
import { useTheme } from '../lib/theme-context';

// A screen that throws while drawing shows its message instead of closing the app.
export default function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: 14, padding: 24, backgroundColor: c.bg }}>
      <Txt style={{ fontSize: 20, fontWeight: '800' }}>Something went wrong</Txt>
      <Txt style={{ color: c.muted }}>{error.message}</Txt>
      <Btn onPress={retry}>Try again</Btn>
    </View>
  );
}
