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

- [ ] Community App: opens to Tonight at localhost:8081 without signing in
- [ ] Admin Dashboard: Login page at localhost:3000, no console errors
- [ ] Partner Dashboard: Login page at localhost:3001, no console errors
- [ ] Firebase connected (login attempt doesn't show "Firebase not initialized")

---

## Granting Partner Role

### 1. Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/project/community-86792/settings/serviceaccounts/adminsdk
2. Click "Generate new private key" → save as `serviceAccountKey.json`
3. **Do NOT commit this file to git**

### 2. Set Environment Variable & Run Script

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
cd apps/partner-dashboard
node scripts/set-partner-role.js set cameron.fadjo@gmail.com
```

### 3. Sign Out and Back In

Custom claims require a token refresh. Sign out completely, clear cookies or use incognito, then sign back in.

### Script Reference

```bash
node scripts/set-partner-role.js set email@example.com    # Grant partner
node scripts/set-partner-role.js remove email@example.com  # Revoke partner
node scripts/set-partner-role.js list                      # List all partners
```

---

## Granting Admin Role

Uses the same service account key. Run from the repository root:

```bash
pnpm --filter @community/admin-dashboard set-admin list
pnpm --filter @community/admin-dashboard set-admin set email@example.com
pnpm --filter @community/admin-dashboard set-admin remove email@example.com
```

An account holds one role, so granting admin replaces partner. Use separate
accounts to sign in to both dashboards. Sign out and back in afterwards.

Roles are only granted with these scripts. The `setAdminClaim` and
`setPartnerClaim` Cloud Functions were removed in September 2026.

---

## Production Deployment

### 1. Firebase Backend

```bash
cd apps/community

# Remove 'system' venue bypass in firestore.rules (after seeding)

# Deploy (order matters: rules first, then functions)
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
firebase deploy --only functions   # builds first; runs on Node.js 22
```

Then seed the starting activities from the repository root:

```bash
pnpm --filter @community/admin-dashboard seed:activities
```

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
cd Community
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
- [ ] `system` venue bypass removed
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
| "Module not found" | Stale deps | `rm -rf node_modules && npm install` |
| "Firebase not initialized" | Missing/wrong .env.local | Check file exists with `NEXT_PUBLIC_` prefixed vars, restart dev server |
| "Access denied" on Partner Dashboard | No partner claim or stale token | Run set-partner-role script, sign out and back in, clear cookies |
| Community App won't start | Expo cache | `npx expo start --clear` |

---

*Last consolidated: March 30, 2026*
*Sources: DEPLOYMENT_GUIDE.md, STARTUP_CHECKLIST.md, SETUP_PARTNER_ROLE.md*
