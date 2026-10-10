import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTabBar, { tabsHeight } from '../../components/AppTabBar';
import TopBar from '../../components/TopBar';
import ItemSheet from '../../components/ItemSheet';
import BurstLayer from '../../components/BurstLayer';
import { ToastProvider, useToast } from '../../components/ui';
import * as commands from '../../lib/commands';
import { getData } from '../../lib/data';
import { readResponse } from '../../lib/notify';
import { openItem } from '../../lib/ui-state';

// Notification buttons and taps, and calendars that are due a refresh.
function Background() {
  const toast = useToast();
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef('');
  useEffect(() => {
    const tap = readResponse(response);
    if (!tap || handled.current === tap.key) return;
    handled.current = tap.key;
    const item = getData().items.find((i) => i.id === tap.itemId);
    if (tap.action === 'open') { if (item) { router.navigate('/calendar'); openItem(item, undefined, tap.date || undefined); } return; }
    const r = commands.respondTo(tap.itemId, tap.date, tap.action);
    if (r.ok) toast.show(tap.action === 'done' ? `Done: ${r.title}` : `Snoozed: ${r.title}`);
  }, [response, router, toast]);
  useEffect(() => {
    void commands.syncDueFeeds();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void commands.syncDueFeeds());
    return () => sub.remove();
  }, []);
  return null;
}

// Every page shares the app frame: the top bar and the tab bar.
export default function AppLayout() {
  const insets = useSafeAreaInsets();
  return (
    <ToastProvider bottom={tabsHeight(insets.bottom) + 16}>
      <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ header: () => <TopBar /> }}>
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="bin" options={{ title: 'Bin' }} />
        <Tabs.Screen name="customize" options={{ title: 'Customize' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
      <BurstLayer />
      <Background />
      <ItemSheet />
    </ToastProvider>
  );
}
