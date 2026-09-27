# Partner Dashboard

Where venues and event hosts post and manage their own events. Built with
Next.js.

Moderation of users, venues, and reviews lives in the admin dashboard
(`apps/admin-dashboard`). Partners cannot see other people's accounts.

## What partners can do

- **Post events**, one-off or repeating weekly, every two weeks, or monthly
- **Edit or cancel** their own events
- **Copy** an event to post it again
- **Add a perk** to an event and see how many were unlocked and used

Partners see totals for their perks, never who used them.

## Prerequisites

- Node.js 18+ installed
- Firebase project with Blaze (pay-as-you-go) plan
- Firebase service account key for admin operations

## Setup

### 1. Install Dependencies

```bash
cd partner-dashboard
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `partner-dashboard` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these values from:
1. Firebase Console > Project Settings > General
2. Scroll to "Your apps" section
3. Click on the web app or create one if it doesn't exist

### 3. Set Up Firebase Service Account

For setting partner roles, you need a service account key:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json` in a secure location
4. **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore`

Set the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### 4. Grant Partner Role to Your Account

First, register your account in the main Community App. Then run:

```bash
node scripts/set-partner-role.js set your-email@example.com
```

**Important**: You must sign out and sign back in after the role is granted.

### 5. Start Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

## Pages

| Page | Address |
|---|---|
| Sign in | `/login` |
| Your events | `/dashboard/events` |
| Post an event | `/dashboard/events/new` |
| Edit an event | `/dashboard/events/<id>` |

`/dashboard` leads to the events page.

## Common issues

### "Access denied. Partner account required."

Grant the partner role, then sign out and back in:

```bash
node scripts/set-partner-role.js set your-email@example.com
```

An account holds one role. Granting admin to an account replaces partner,
so use separate accounts for the two dashboards.

### No venues to choose when posting

A venue must be approved in the admin dashboard before events can be posted
there.

### Environment variables not loading

Check that `.env.local` exists in this folder and restart the server.

## Security notes

- Never commit `serviceAccountKey.json`, `.env.local`, or any file with keys.
- The security rules let a partner create, edit, and delete only their own
  events. They cannot read user accounts or change venues.
- List who holds the partner role from time to time:

```bash
node scripts/set-partner-role.js list
```

## Scripts

- `pnpm --filter @community/partner-dashboard dev` starts it on port 3001
- `pnpm --filter @community/partner-dashboard build` builds it
- `pnpm --filter @community/partner-dashboard type-check` checks types
