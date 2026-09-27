# Admin Dashboard

Where the app's owner keeps the app in order. Built with Next.js, on port
3000. Only accounts with the admin role can sign in.

## What admins can do

- **Venues:** approve or reject venues, and mark one as featured. A venue
  must be approved before events can be posted there.
- **Accounts:** see who has an account, and block one.
- **Overview:** totals for accounts, venues, and upcoming events.

Partners post their own events in the partner dashboard. Admins can take any
event down.

## Run it

From the repository root:

```bash
pnpm install
pnpm turbo build --filter='./packages/*'
pnpm --filter @community/admin-dashboard dev
```

Create `.env.local` in this folder with the `NEXT_PUBLIC_FIREBASE_*` values
from the Firebase console.

## Pages

| Page | Address |
|---|---|
| Sign in | `/login` |
| Overview | `/dashboard` |
| Accounts | `/dashboard/users` |
| Venues | `/dashboard/venues` |

## Scripts

Each needs a service account key. See `docs/OPERATIONS.md`.

| Command | What it does |
|---|---|
| `pnpm --filter @community/admin-dashboard set-admin set <email>` | Grants the admin role |
| `pnpm --filter @community/admin-dashboard set-partner set <email>` | Grants the partner role |
| `pnpm --filter @community/admin-dashboard seed:activities` | Adds missing activities and switches off retired ones |

Use `remove` or `list` in place of `set` to remove a role or list who has it.

## How access works

1. The person signs in with email and password.
2. The dashboard checks that their account has the admin role.
3. The security rules check the same thing on every read and write, so the
   dashboard is not the only guard.

An account holds one role. Use a separate account for the partner dashboard.
