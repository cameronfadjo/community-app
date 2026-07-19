# Partner Dashboard - Reference

Combined implementation guide and current state summary.

---

## Overview

Next.js web dashboard for venue partners to moderate content, manage venues, and view analytics. Runs on port 3001 alongside the admin dashboard (port 3000).

**Role required:** `role: 'partner'` Firebase custom claim

---

## Current State (Feature-Complete)

| Feature | Status | Files |
|---------|--------|-------|
| Authentication & access control | Done | `lib/contexts/AuthContext.tsx`, `lib/firebase/` |
| User moderation (filter/approve/reject/revoke) | Done | `app/dashboard/users/page.tsx` |
| Venue moderation (approve/reject/feature) | Done | `app/dashboard/venues/page.tsx` |
| Review management (filter/delete) | Done | `app/dashboard/reviews/page.tsx` |
| Analytics (7-day activity, categories, top venues) | Done | `app/dashboard/analytics/page.tsx` |
| Toast notifications | Done | `lib/toast.tsx` |
| Error boundaries | Done | `app/error.tsx`, `app/dashboard/error.tsx` |
| Loading skeletons | Done | `components/LoadingSkeleton.tsx` |
| Constants/helpers | Done | `lib/constants.ts` |
| Role management CLI | Done | `scripts/set-partner-role.js` |

### File Structure

```
partner-dashboard/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard shell (fixed isAdmin→isPartner)
│   │   ├── page.tsx              # Overview with stats
│   │   ├── users/page.tsx        # User moderation
│   │   ├── venues/page.tsx       # Venue moderation
│   │   ├── reviews/page.tsx      # Review management
│   │   ├── analytics/page.tsx    # Analytics
│   │   └── error.tsx             # Dashboard error boundary
│   ├── login/page.tsx            # Partner login
│   ├── layout.tsx                # Root (AuthProvider + ToastProvider)
│   ├── error.tsx                 # Root error boundary
│   └── page.tsx                  # Redirect
├── components/
│   └── LoadingSkeleton.tsx       # Skeleton components
├── lib/
│   ├── contexts/AuthContext.tsx   # Auth state, partner role check
│   ├── firebase/
│   │   ├── config.ts             # Firebase client config
│   │   └── auth.ts               # Auth helpers
│   ├── toast.tsx                 # Toast notification system
│   └── constants.ts              # Shared constants & helpers
├── scripts/
│   └── set-partner-role.js       # CLI for role management
└── types/index.ts                # TypeScript definitions
```

---

## Authentication Flow

1. User signs in with email/password
2. `AuthContext` retrieves user and checks `claims.role === 'partner'`
3. Non-partner users are signed out and shown "Access denied"
4. Dashboard layout enforces partner check on all routes
5. Token must be refreshed (sign out/in) after role changes

---

## Known Gaps

### Needs Configuration
- `.env.local` with Firebase config (6 `NEXT_PUBLIC_` vars)
- Firebase service account key for role management script
- Firestore security rules for partner read/write access
- Firebase indexes (auto-created on first query)

### Not Yet Built (Future Phases)
- **Venue claiming flow** — Partners claim unclaimed venues with business verification
- **Offer management** — CRUD for offers with scheduling, limits, tracking
- **Partner analytics** — Redemption stats, customer demographics, peak times
- **Partner profile** — Business info, subscription tier, notifications

### Planned Database Changes for Future Phases

```typescript
// venues collection additions
{
  claimStatus: 'unclaimed' | 'pending' | 'verified',
  partnerId?: string,
  claimedAt?: Timestamp,
}

// partners collection
{
  uid: string,
  email: string,
  businessName: string,
  role: 'partner',
  venueIds: string[],
  verified: boolean,
  subscriptionTier: 'free' | 'basic' | 'premium',
  moderationStatus: 'pending' | 'approved' | 'rejected',
}
```

### Planned Security Rules for Future Phases

```javascript
match /partners/{partnerId} {
  allow read: if request.auth.uid == partnerId || hasRole('admin');
  allow update: if request.auth.uid == partnerId || hasRole('admin');
}

match /venueOffers/{offerId} {
  allow read: if true;
  allow create: if hasRole('partner') &&
                   request.resource.data.venueId in request.auth.token.venueIds;
  allow update, delete: if hasRole('partner') &&
                           resource.data.venueId in request.auth.token.venueIds;
}
```

---

## Toast Migration Status

| Page | Toasts | Status |
|------|--------|--------|
| Users | Success/error on approve/reject | Done |
| Venues | — | Needs migration from `alert()` |
| Reviews | — | Needs migration from `alert()` |
| Login | — | Needs migration from `alert()` |

---

*Last consolidated: March 30, 2026*
*Sources: PARTNER_DASHBOARD_GUIDE.md, PARTNER_DASHBOARD_SUMMARY.md*
