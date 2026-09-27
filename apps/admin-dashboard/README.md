# Admin Dashboard

Where the app's owner keeps the app in order. Built with Next.js, on port
3000. Only accounts with the admin role can sign in.

## What admins can do

- **Venues:** add a venue, edit its details, verify it, approve or reject
  it, and mark one as featured. A venue must be approved before events can
  be posted there.
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
| Add a venue | `/dashboard/venues/new` |
| Edit a venue | `/dashboard/venues/<id>` |

## Scripts

Each needs a service account key. See `docs/OPERATIONS.md`.

| Command | What it does |
|---|---|
| `pnpm --filter @community/admin-dashboard set-admin set <email>` | Grants the admin role |
| `pnpm --filter @community/admin-dashboard set-partner set <email>` | Grants the partner role |
| `pnpm --filter @community/admin-dashboard seed:activities` | Adds missing activities and switches off retired ones |
| `pnpm --filter @community/admin-dashboard seed:venues` | Loads the Connecticut venue list, each venue waiting for approval |

Add `--dry-run` to either seed command to see what it would do without
changing anything. `seed:venues` also takes `--town "New Haven"` to load one
town at a time.

## From added to approved

Every venue goes through the same three steps, whoever added it and however
it arrived:

| Step | What it means |
|---|---|
| Added | Saved as waiting and unverified. It may be missing its address or map position. |
| Verified | An admin has checked the name, the address, and that the map position sits on the front door. |
| Approved | Partners can post events there. |

Adding a venue never verifies it. That is always a separate step, so
details from a list or a form are checked before anyone relies on them.

Changing a verified venue's name, address, or map position makes it
unverified again. If it was approved, it goes back to waiting.

The security rules enforce this too: a venue can't be approved unless it is
verified and has an address and a map position.

## The map position

Distances and perks depend on each venue's position, so it should sit on the
front door. In the form, "Find it on the map" opens the venue in Google
Maps. Right-click the door, choose the numbers at the top of the menu to
copy them, and paste them into the form.

Use `remove` or `list` in place of `set` to remove a role or list who has it.

## How access works

1. The person signs in with email and password.
2. The dashboard checks that their account has the admin role.
3. The security rules check the same thing on every read and write, so the
   dashboard is not the only guard.

An account holds one role. Use a separate account for the partner dashboard.
