# ChronKeep Mobile

The phone version of [ChronKeep](../chronkeep): the same calendar, tasks, history, bin, customize and settings pages, with the same design, wording and rules. Built with Expo SDK 57 for iOS and Android.

You sign in with your ChronKeep account (email and password, Google, or Apple). Everything is kept on the phone (`chronkeep/data.json`, with daily backups) and reminders are local notifications scheduled by the phone itself, so they arrive with no signal. In the background the phone syncs with your account, so the web app and the phone show the same things: changes made on either side, including deletions, the bin, settings, the note, calendars and files, reach the other within about a minute, and changes made offline are sent when the phone is back online. The cloud is the web project's `cloud/` server (see its `docs/SETUP.md`); set `EXPO_PUBLIC_API_URL` to its address.

## What is ported

| Web | Mobile |
| --- | --- |
| `public/recur.js`, `quick.js` and `lib/ics.js`, `calsync.js` | `lib/recur.ts`, `quick.ts`, `ics.ts`, `calsync.ts` (the web's own tests run against them) |
| Reminder rules (`server.js` scheduling) | `lib/schedule.ts`, which hands the nearest reminders to the OS (60 on iOS, 200 on Android) |
| Calendar (day, 3 days, month), tasks, history, bin | `app/(app)/calendar.tsx`, `tasks.tsx`, `history.tsx`, `bin.tsx` |
| New/edit dialog, quick add, search, note, bell, account menu | `components/ItemSheet.tsx`, `tasks/QuickAdd.tsx`, `components/topbar/*` |
| Customize, Settings | `app/(app)/customize.tsx`, `settings.tsx` |
| Snooze and Done buttons on notifications | `lib/notify.ts` and `app/(app)/_layout.tsx` |
| Accounts and sync (`lib/sync.js` on the server) | `lib/sync.ts`, `lib/sync-run.ts`, `lib/auth.ts`, `app/login.tsx`, `app/signup.tsx` |

Where the phone differs: the Notifications card controls this phone (permission, test, system settings) instead of Mac popups and ntfy; the "Other devices" and "Start with your Mac" cards do not apply; colour fields are hex codes with a swatch.

## Run it

```sh
npm install
npx expo start          # press i for the iOS simulator, a for Android, or scan with Expo Go
npm test                # 100+ tests
npm run typecheck
```

`EXPO_PUBLIC_SEED=1 npx expo start` fills an empty install with sample items (never your real data).

## Release with Expo (iOS and Android)

1. `npm install -g eas-cli` and `eas login`.
2. `eas init` (creates the project and writes its id into `app.json`).
3. `eas build --platform all --profile production` (asks for your Apple Developer and Google Play details the first time).
4. `eas submit --platform ios` and `eas submit --platform android`.

The bundle id and package name are `com.victorabuchi.chronkeep`. Change them in `app.json` before the first build if you want another.
