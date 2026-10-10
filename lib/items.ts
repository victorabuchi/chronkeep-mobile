import { uuid } from './ids';
import type { Item } from './types';

// A new item with every field the web's items have, then your changes on top.
export function newItem(patch: Partial<Item> = {}): Item {
  const now = Date.now();
  return {
    id: uuid(), type: 'todo', title: '', notes: '', location: '', date: '', time: '', endTime: '', endDate: '', category: '', priority: '',
    subtasks: [], attachments: [], done: false, doneAt: null, doneOn: [], reminders: [], nudges: [], repeat: 'none', createdAt: now, updatedAt: now, ...patch,
  };
}
