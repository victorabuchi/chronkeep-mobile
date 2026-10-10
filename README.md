# ChronKeep Mobile

The phone app for [ChronKeep](https://github.com/victorabuchi/chronkeep), a calendar and to-do list that keeps reminding you until the assignment is done. Built with Expo SDK 57 (React Native) for iOS and Android, in the same design as the web app.

You sign in with your ChronKeep account (email and password, Google, or Apple). Everything is kept on the phone and reminders are local notifications scheduled by the phone itself, so they arrive with no signal. In the background the phone syncs with your account, so the web app and the phone show the same things: changes made on either side, including deletions, the bin, settings, the note, calendars and files, reach the other within about a minute, and changes made offline are sent when the phone is back online.

The cloud is the web project's `cloud/` server (see its `docs/SETUP.md`). The phone talks to the address in `EXPO_PUBLIC_API_URL` (set per build profile in `eas.json`; the default is `https://chronkeep.onrender.com`).

## What is in the app

- **Calendar:** Day, 3 days and 7 days. The 7-day week scrolls sideways with the day heads and the hour labels pinned. It always opens at the start of the day (7:00 by default).
- **Deadline strip:** the DUE row at the top of each day keeps deadlines compact: same-title deadlines merge into one counted pill, a day shows at most three pills, and "+N more" or a merged pill opens a sheet listing everything due that day. The **Events** filter has no DUE row.
- **Assignments and To-dos:** each has its own full-screen page. Assignments are compact rows grouped by when they are due; **To-dos are big cards** with a large tick, notes, steps (each with its own tick and a progress bar), reminders and files.
- **Calendar links:** follow a link (a university timetable, Moodle) and say what it contains: a **Timetable** (lessons, shown as events) or **Deadlines** (exercises and assignments, shown as tasks, due when each window closes). A saved link can be renamed, given another course, or switched between the two.
- **Also:** quick add that reads a sentence ("Robotics report due Sunday 11pm"), search with add, the note, the bell (upcoming and earlier), History with on-time stats, a 30-day Bin, repeating reminders with Snooze and Done buttons on the notification, dark mode, backups, export and import.

## Run it

```sh
npm install
npx expo start          # press i for the iOS simulator, a for Android, or scan with Expo Go
npm test                # unit and screen tests
npm run typecheck
npx expo-doctor         # dependency check against the Expo SDK
```

Useful while developing:

- `EXPO_PUBLIC_API_URL=http://localhost:3100 npx expo start` talks to a cloud server running on your computer (`npm run start:cloud` in the web project).
- `EXPO_PUBLIC_SEED=1` fills an empty install with sample items (never real data).
- `chronkeep://calendar?view=week&date=2026-10-13` opens the calendar in a view on a day.

Expo Go cannot fully run notifications. For those, use a development or production build.

## How it is organised

| Part | Where |
| --- | --- |
| Screens (Expo Router) | `app/` (`(app)/calendar`, `tasks`, `history`, `bin`, `customize`, `settings`; `login`, `signup`) |
| Components | `components/` (calendar grids and the deadline strip, task rows and to-do cards, item sheet, top bar and its dropdowns) |
| Rules shared with the web app (recurrence, sentence parsing, calendar files, reminder planning) | `lib/recur.ts`, `quick.ts`, `ics.ts`, `calsync.ts`, `schedule.ts` (the web's own tests run against them) |
| Data on the phone (atomic saves, damaged-file recovery, daily backups) | `lib/store.ts`, `data.ts`, `actions.ts` |
| Accounts and sync | `lib/auth.ts`, `session.ts`, `sync.ts`, `sync-run.ts` (`sync.ts` is tested against the server's `lib/sync.js`) |
| Notifications | `lib/notify.ts` |

## Release with Expo (iOS and Android)

1. `npm install -g eas-cli` and `eas login`.
2. `eas init` (creates the project and writes its id into `app.json`).
3. Check `EXPO_PUBLIC_API_URL` in `eas.json` is your server's address.
4. `eas build --platform all --profile production` (asks for your Apple Developer and Google Play details the first time).
5. `eas submit --platform ios` and `eas submit --platform android`.

The bundle id and package name are `com.victorabuchi.chronkeep`. Sign in with Apple must work for the iOS review (the app offers Google): see the web project's `docs/SETUP.md` for the credentials, and give the reviewers a demo account.
