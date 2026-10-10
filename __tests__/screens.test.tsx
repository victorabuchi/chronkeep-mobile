import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///doc/', cacheDirectory: 'file:///cache/' }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), getPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }), cancelAllScheduledNotificationsAsync: async () => undefined, scheduleNotificationAsync: async () => 'id', SchedulableTriggerInputTypes: {}, AndroidImportance: {}, DEFAULT_ACTION_IDENTIFIER: 'default' }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('expo-haptics', () => ({ impactAsync: async () => undefined, notificationAsync: async () => undefined, selectionAsync: async () => undefined, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), SafeAreaProvider: ({ children }: { children: ReactNode }) => children }));
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({}));

import Bin from '../app/(app)/bin';
import History from '../app/(app)/history';
import Tasks from '../app/(app)/tasks';
import { ToastProvider } from '../components/ui';
import { getData, replaceAll } from '../lib/data';
import { seed } from '../lib/seed';
import { ThemeProvider } from '../lib/theme-context';
import { emptyData } from '../lib/store';
import { removeItem } from '../lib/commands';

const wrap = (ui: ReactNode) => <ThemeProvider><ToastProvider>{ui}</ToastProvider></ThemeProvider>;

beforeEach(() => replaceAll(seed(emptyData())));

test('Tasks groups what is owed and shows steps', async () => {
  await render(wrap(<Tasks />));
  expect(screen.getByText('Tasks')).toBeTruthy();
  expect(screen.getByText('Overdue')).toBeTruthy();
  expect(screen.getByText('1 day overdue')).toBeTruthy();
  expect(screen.getByText('Robotics report')).toBeTruthy();
  expect(screen.getByText('Collect data')).toBeTruthy();
  expect(screen.getByText('Show 1 completed')).toBeTruthy();
});

test('History lists what was completed', async () => {
  await render(wrap(<History />));
  expect(screen.getByText('Statistics homework')).toBeTruthy();
  expect(screen.getByText('Machine Learning lecture')).toBeTruthy();
});

test('Bin shows a deleted item and can bring it back', async () => {
  const id = getData().items.find((i) => i.title === 'Call the bank')!.id;
  removeItem(id);
  await render(wrap(<Bin />));
  expect(screen.getByText('Call the bank')).toBeTruthy();
  await fireEvent.press(screen.getByText('Restore'));
  expect(getData().items.some((i) => i.id === id)).toBe(true);
});

test('To-dos show as big cards with their details, and the Assignments filter keeps the compact rows', async () => {
  const { setUI } = require('../lib/ui-state');
  const { addItem } = require('../lib/commands');
  addItem({ type: 'todo', title: 'Plan the trip', date: '2026-10-14', notes: 'Trains and a hostel', subtasks: [{ id: 's1', text: 'Book the hostel', done: false }, { id: 's2', text: 'Compare trains', done: true }], reminders: [1440] });
  setUI({ typeF: 'todo' });
  await render(wrap(<Tasks />));
  expect(screen.getByText('Plan the trip')).toBeTruthy();
  expect(screen.getByText('Trains and a hostel')).toBeTruthy();
  expect(screen.getAllByText('1 of 2 steps').length).toBe(2); // this to-do, and the Robotics report assignment
  expect(screen.getByText('Book the hostel')).toBeTruthy();
  expect(screen.getByText('1 day before')).toBeTruthy();
  // and the To-do page includes the open assignments too
  expect(screen.getByText('Robotics report')).toBeTruthy();
  setUI({ typeF: 'all' });
});
