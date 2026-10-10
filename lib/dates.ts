import { addDays, day, ymd } from './recur';

// Day and time wording, the same as the web app's. No Intl: the phone's JavaScript engine has little of it.
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const pad = (n: number) => String(n).padStart(2, '0');
export { addDays, day, ymd };

export const today = () => ymd(new Date());
export const fmtDay = (ds: string) => `${DOW[day(ds).getDay()]} ${day(ds).getDate()} ${MON[day(ds).getMonth()]!.slice(0, 3)}`;
export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// "2 days 3 h", "45 min": a length of time in minutes.
export function human(m: number): string {
  m = Math.round(m);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  return d ? `${d} day${d > 1 ? 's' : ''}${h ? ` ${h} h` : ''}` : h ? `${h} h${mi ? ` ${mi} min` : ''}` : `${mi} min`;
}
// "1 day", "3 hours", "30 min": a reminder lead time.
export const lead = (min: number) => (min >= 1440 ? `${Math.round(min / 1440)} day${min >= 2880 ? 's' : ''}` : min >= 60 ? `${Math.round(min / 60)} hour${min >= 120 ? 's' : ''}` : `${min} min`);

// "5 min ago", "2 h ago", "3 days ago".
export const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? '' : 's'} ago`;
};

// "in 30 min", "Today, 20:59", "Tomorrow, 08:00", "Sun 11 Oct, 14:00": when a notification is (or was).
export function whenText(ms: number, now = Date.now()): string {
  const d = new Date(ms), n = new Date(now), diff = ms - now;
  if (Math.abs(diff) < 3600000) {
    const m = Math.round(Math.abs(diff) / 60000);
    return diff < 0 ? (m < 1 ? 'just now' : `${m} min ago`) : m < 1 ? 'now' : `in ${m} min`;
  }
  const dd = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
  const label = dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : dd === -1 ? 'Yesterday' : fmtDay(ymd(d));
  return `${label}, ${hm(d)}`;
}

export const typeLabel = (t: string) => (t === 'assignment' ? 'Assignment' : t === 'event' ? 'Event' : 'To-do');
