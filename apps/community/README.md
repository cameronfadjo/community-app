# Community app

The app people use: pick what you're up for, see what's on near you, and go.
Built with Expo and React Native. It also runs in a browser for development.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='./packages/*'
pnpm --filter @community/mobile dev
```

Press `w` to open it in a browser at http://localhost:8081.

Copy `.env.example` to `.env` and fill in the Firebase values first.

When no events have been posted, a development build shows sample events so
the screens are not empty. A release build never shows them.

## Screens

| Screen | File |
|---|---|
| Welcome, asked once: confirm you are 18 or older | `app/welcome.tsx` |
| What's on: activity tiles, today or this week | `app/(tabs)/whats-on.tsx` |
| Near you: events by distance | `app/(tabs)/map.tsx` |
| Perks | `app/(tabs)/perks.tsx` |
| One activity's events, with filters | `app/activity/[id].tsx` |
| One event | `app/event/[id].tsx` |
| Just pick for me | `app/pick.tsx` |
| Show a perk at the bar | `app/perk/[eventId].tsx` |
| Account, and nudges | `app/account.tsx`, `app/notifications.tsx` |
| Sign in, sign up, reset password | `app/auth/` |

## How it is put together

- **Rules that can be tested** live in `packages/types` and are shared with
  the dashboards: event times, repeats, perks, nudges, sign-up.
- **`src/store`** holds what the screens share: events, perks, sign-in,
  nudges, and the welcome confirmation.
- **`src/services`** talks to Firebase.
- **`functions/`** holds the Cloud Functions. It has its own `package.json`
  and is installed with `npm`, not `pnpm`.

## Privacy by design

- Browsing needs no account.
- Location is read while the app is open and is never sent to the server.
- Nudges are scheduled on the phone.
- Nobody has a public profile.

## Firebase

`firestore.rules`, `firestore.indexes.json`, `storage.rules`, and
`firebase.json` are in this folder. Deploy from here. See
`docs/OPERATIONS.md`.
