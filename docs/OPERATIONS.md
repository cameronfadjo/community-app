# Community App - Operations Guide

Deployment, startup, and role management for the Community App ecosystem.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+ (`node --version`)
- pnpm 9+ (`npm install -g pnpm`)
- Firebase project: `community-86792` (Blaze plan)

### Start the Apps

From the repository root:

```bash
pnpm install

pnpm --filter @community/mobile dev              # Expo; press 'w' for web at localhost:8081
pnpm --filter @community/admin-dashboard dev     # http://localhost:3000
pnpm --filter @community/partner-dashboard dev   # http://localhost:3001
```

### Verify Setup

- [ ] Community App: opens to What's on at localhost:8081 without signing in
- [ ] Admin Dashboard: Login page at localhost:3000, no console errors
- [ ] Partner Dashboard: Login page at localhost:3001, no console errors
- [ ] Firebase connected (login attempt doesn't show "Firebase not initialized")

---

## Granting roles

Roles are granted with a script, using a service account key.

### 1. Get the key

1. Go to: https://console.firebase.google.com/project/community-86792/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" and save the file outside the project.
3. **Never commit this file.** It gives full access to the project.

### 2. Run the script

From the repository root:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"

pnpm --filter @community/admin-dashboard set-admin list
pnpm --filter @community/admin-dashboard set-admin set email@example.com
pnpm --filter @community/admin-dashboard set-admin remove email@example.com

pnpm --filter @community/admin-dashboard set-partner list
pnpm --filter @community/admin-dashboard set-partner set email@example.com
pnpm --filter @community/admin-dashboard set-partner remove email@example.com
```

The account must already exist. Create it by signing up in the app.

### 3. Sign out and back in

A new role takes effect at the next sign-in.

An account holds one role, so granting one replaces the other. Use separate
accounts for the admin and partner dashboards.

| Role | Can |
|---|---|
| Admin | Approve venues, block accounts, manage activities, take down any event |
| Partner | Post, edit, and cancel their own events |

---

## Production Deployment

### 1. Firebase Backend

```bash
cd apps/community

# Deploy (order matters: rules first, then functions)
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage    # only once Storage is set up in the project
firebase deploy --only functions   # builds first; runs on Node.js 22
```

Deploying functions or indexes after this clean-up asks whether to delete
the ones that are no longer in the code (the review functions and old
indexes). Answer yes.

Then seed the starting activities and venues from the repository root:

```bash
pnpm --filter @community/admin-dashboard seed:activities
pnpm --filter @community/admin-dashboard seed:venues --dry-run
pnpm --filter @community/admin-dashboard seed:venues --town "New Haven"
```

Venues arrive waiting and unverified. In the admin dashboard, check each
one's details, mark it verified, then approve it.

### 2. Dashboards (Vercel — Recommended)

For each dashboard (`admin-dashboard`, `partner-dashboard`):

1. Import Git repo in [Vercel](https://vercel.com)
2. Set root directory to the dashboard folder
3. Add environment variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
4. Configure custom domain (e.g., `admin.yourcommunityapp.com`, `partner.yourcommunityapp.com`)
5. Push to deploy

### 3. Mobile App (EAS Build)

```bash
cd apps/community
npm install -g eas-cli
eas login
eas build:configure

# Build
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit
eas submit --platform ios
eas submit --platform android
```

### 4. Post-Deployment

```bash
# Grant initial admin access (see Granting Admin Role)
pnpm --filter @community/admin-dashboard set-admin set admin@company.com

# Monitor logs
firebase functions:log
```

### Pre-Launch Checklist

- [ ] Firestore security rules deployed
- [ ] SSL certificates active
- [ ] Admin account created and tested
- [ ] Partner account created and tested
- [ ] All smoke tests passed
- [ ] Error tracking enabled (Sentry recommended)
- [ ] Firebase budget alerts configured

### Rollback

- **Functions:** `git checkout PREVIOUS_COMMIT && firebase deploy --only functions`
- **Firestore Rules:** Firebase Console > Firestore > Rules > History > select previous version
- **Dashboards (Vercel):** Deployments > previous deployment > Promote to Production
- **Firebase Hosting:** `firebase hosting:rollback`

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS errors in production | Domain not in allowedOrigins | Update Cloud Functions with production domains, redeploy |
| "Permission denied" on Firestore | Rules not deployed or wrong role | Deploy rules, verify user custom claims in Firebase Console |
| "Port already in use" | Leftover process | `kill -9 $(lsof -ti:3000)` |
| "Module not found" | Stale deps, or shared packages not built | `pnpm install && pnpm turbo build --filter='./packages/*'` |
| "Firebase not initialized" | Missing/wrong .env.local | Check file exists with `NEXT_PUBLIC_` prefixed vars, restart dev server |
| "Access denied" on a dashboard | The account lacks the role, or signed in before it was granted | Grant the role (see Granting roles), then sign out and back in |
| Community App won't start | Expo cache | `npx expo start --clear` |

---

*Last updated: September 27, 2026*
