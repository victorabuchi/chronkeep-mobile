import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold, useFonts } from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import ErrorScreen from '../components/ErrorScreen';
import { initData, useReady } from '../lib/data';
import { logIn } from '../lib/auth';
import { getToken, loadSession, useSessionReady, useToken } from '../lib/session';
import { startSync } from '../lib/sync-run';
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
  const token = useToken();
  // Signed in: the app, kept in step with the cloud. Signed out: the sign-in screens.
  useEffect(() => (token ? startSync() : undefined), [token]);
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  // ChronKeep is set in Figtree, like the web app.
  const [fonts] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold });
  const ready = useReady(), sessionReady = useSessionReady();
  useEffect(() => {
    void initData();
    // Development only: EXPO_PUBLIC_DEV_LOGIN="email:password" signs in at start, to try the app against a local server.
    void loadSession().then(async () => {
      const dev = __DEV__ ? process.env.EXPO_PUBLIC_DEV_LOGIN : '';
      if (dev && !getToken()) { const [e, ...rest] = dev.split(':'); await logIn(e!, rest.join(':')).catch(() => undefined); }
    });
    void setupNotifications().catch(() => undefined);
  }, []);
  useEffect(() => {
    if (fonts && ready && sessionReady) void SplashScreen.hideAsync();
  }, [fonts, ready, sessionReady]);
  if (!fonts || !ready || !sessionReady) return null;
  return (
    <ThemeProvider>
      <Frame />
    </ThemeProvider>
  );
}
