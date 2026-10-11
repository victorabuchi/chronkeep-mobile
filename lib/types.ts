// The data model: the same item, settings and profile shapes as the web app (see ../chronkeep/docs/API.md).

export type ItemType = 'assignment' | 'event' | 'todo';
export type Priority = '' | 'low' | 'medium' | 'high';
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly';

// A repeating reminder: starts `from` minutes before the due time ('day' = from midnight of the due day)
// and repeats every `every` minutes. The latest rule that has started wins.
export type Nudge = { from: number | 'day'; every: number };
export type Subtask = { id: string; text: string; done: boolean };
export type Attachment = { id: string; name: string; size: number; type: string; addedAt: number; local?: boolean };

export type Item = {
  id: string;
  type: ItemType;
  title: string;
  notes: string;
  location: string;
  date: string; // YYYY-MM-DD, '' = no date
  time: string; // HH:MM, '' = all day
  endTime: string;
  endDate: string;
  category: string;
  subject?: string; // under Study: which subject it is for
  priority: Priority;
  subtasks: Subtask[];
  attachments: Attachment[];
  done: boolean;
  doneAt: number | null;
  doneOn: string[];
  reminders: number[];
  nudges: Nudge[];
  repeat: Repeat;
  repeatUntil?: string;
  skip?: string[];
  source?: { feed: string; key: string };
  createdAt: number;
  updatedAt: number;
};

export type TrashItem = Item & { deletedAt: number };

export type Category = { name: string; color: string };

export type Settings = {
  name: string;
  accent: string;
  theme: 'auto' | 'light' | 'dark';
  weekStart: 0 | 1;
  showWeekends: boolean;
  dayStart: number;
  dayEnd: number;
  allDayHour: number;
  dueTime: string;
  reminderDefaults: { assignment: number[]; event: number[]; todo: number[] };
  nudgeDefaults: { assignment: Nudge[]; event: Nudge[]; todo: Nudge[] };
  nagHours: number;
  digestHour: number;
  categories: Category[];
  notify: boolean;
};

export type Profile = { name: string; email: string; phone: string; photo: string };

// A calendar holds lessons ('event': shown in the hours) or deadlines ('assignment': exercises and assignments, shown as tasks).
export type FeedKind = 'event' | 'assignment';
export type Feed = { id: string; name: string; url: string; category: string; kind?: FeedKind; enabled: boolean; lastSync: number; lastError: string; count: number };

// A notification the phone has been asked to show (kept so "Earlier" can list what has gone by).
export type Planned = { id: string; at: number; title: string; body: string; itemId: string | null; date: string; kind: 'reminder' | 'repeat' | 'overdue' | 'summary' | 'test' | 'action' };

// Bookkeeping for keeping the phone and the cloud the same (see lib/sync.ts).
export type SyncState = {
  cursor: number; // the last cloud revision this phone has seen
  fp: Record<string, string>; // fingerprint of every item as last synced, to notice what changed here
  partFp: Record<string, string>; // the same for settings, profile, note, calendars
  partAt: Record<string, number>; // when each of those last changed
};

export type AppData = {
  settings: Settings;
  profile: Profile;
  items: Item[];
  trash: TrashItem[];
  feeds: Feed[];
  ignored: string[];
  snoozed: Record<string, number>;
  notepad: { text: string; at: string | null };
  log: Planned[];
  sync: SyncState;
};
