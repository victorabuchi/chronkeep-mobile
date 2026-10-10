import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../lib/theme-context';

// A page: the .main column (12 padding on phones) on the page background.
export default function Screen({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap, padding: 12, paddingTop: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}
