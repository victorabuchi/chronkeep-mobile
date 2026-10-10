import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTabBar, { tabsHeight } from '../../components/AppTabBar';
import TopBar from '../../components/TopBar';
import ItemSheet from '../../components/ItemSheet';
import BurstLayer from '../../components/BurstLayer';
import { ToastProvider } from '../../components/ui';

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
      <ItemSheet />
    </ToastProvider>
  );
}
