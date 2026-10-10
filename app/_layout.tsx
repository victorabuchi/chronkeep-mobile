import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold, useFonts } from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import ErrorScreen from '../components/ErrorScreen';
import { initData, useReady } from '../lib/data';
import { setupNotifications } from '../lib/notify';
import { ThemeProvider, useTheme } from '../lib/theme-context';

void SplashScreen.preventAutoHideAsync();

// A screen that throws while drawing shows its message instead of closing the app.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <ThemeProvider>
      <ErrorScreen error={error} retry={retry} />
    </ThemeProvider>
  );
}

function Frame() {
  const { dark } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  // ChronKeep is set in Figtree, like the web app.
  const [fonts] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold });
  const ready = useReady();
  useEffect(() => {
    void initData();
    void setupNotifications().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (fonts && ready) void SplashScreen.hideAsync();
  }, [fonts, ready]);
  if (!fonts || !ready) return null;
  return (
    <ThemeProvider>
      <Frame />
    </ThemeProvider>
  );
}
