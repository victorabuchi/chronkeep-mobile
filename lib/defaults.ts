import type { Settings } from './types';

// The web app's default settings (server.js defaults()), with the accent colour and course colours it ships with.
export const defaultSettings = (): Settings => ({
  name: 'ChronKeep',
  accent: '#3b5bdb',
  theme: 'auto',
  weekStart: 1,
  showWeekends: true,
  dayStart: 7,
  dayEnd: 22,
  allDayHour: 9,
  dueTime: '23:59',
  reminderDefaults: { assignment: [4320, 1440, 180, 30], event: [10], todo: [0] },
  nudgeDefaults: { assignment: [{ from: 'day', every: 60 }, { from: 60, every: 10 }], event: [], todo: [] },
  nagHours: 6,
  digestHour: 8,
  categories: [
    { name: 'Study', color: '#7c5cf0' },
    { name: 'Work', color: '#0e8fb0' },
    { name: 'Personal', color: '#d6457a' },
    { name: 'Health', color: '#16a36a' },
  ],
  notify: true,
});
