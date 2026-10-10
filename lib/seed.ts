import { addDays, ymd } from './recur';
import { newItem } from './items';
import type { AppData } from './types';

// Sample items for looking at the app (only when started with EXPO_PUBLIC_SEED=1). Never real data.
export function seed(d: AppData): AppData {
  const t = new Date(), at = (n: number) => ymd(addDays(t, n));
  const items = [
    newItem({ type: 'assignment', title: 'Robotics report', date: at(2), time: '23:59', category: 'Study', priority: 'high', reminders: [1440, 180], subtasks: [{ id: 'a1', text: 'Collect data', done: true }, { id: 'a2', text: 'Write the analysis', done: false }] }),
    newItem({ type: 'assignment', title: 'Web Programming essay', date: at(-1), time: '12:00', category: 'Study' }),
    newItem({ type: 'event', title: 'Machine Learning lecture', date: at(0), time: '10:15', endTime: '12:00', category: 'Study', location: 'Metria ML100' }),
    newItem({ type: 'event', title: 'Gym', date: at(0), time: '17:00', endTime: '18:00', category: 'Health', repeat: 'weekly' }),
    newItem({ type: 'event', title: 'Team meeting', date: at(1), time: '09:00', endTime: '10:00', category: 'Work' }),
    newItem({ type: 'todo', title: 'Buy groceries', date: at(0), category: 'Personal' }),
    newItem({ type: 'todo', title: 'Call the bank', date: '' }),
    newItem({ type: 'assignment', title: 'Statistics homework', date: at(-3), time: '23:59', category: 'Study', done: true, doneAt: Date.now() - 3 * 86400000 - 3600000 }),
  ];
  return { ...d, items };
}
