# Community App - Project History & Changelog

A consolidated record of development phases, enhancements, and fixes applied to the Community App ecosystem.

---

## Architecture Overview

Three applications sharing a unified Firebase backend with role-based access control:

| App | Stack | Port | Role |
|-----|-------|------|------|
| Community (Consumer) | Expo + React Native | 8081 | `consumer` |
| Admin Dashboard | Next.js | 3000 | `admin` |
| Partner Dashboard | Next.js | 3001 | `partner` |

**Firebase Project:** `community-86792`

### Custom Claims Structure
- **Consumer:** `{ role: 'consumer', moderationStatus: 'approved' }`
- **Admin:** `{ role: 'admin', permissions: ['moderate_users', 'moderate_venues', ...] }`
- **Partner:** `{ role: 'partner', venueIds: [...], verified: true }`

---

## Phase 1: Foundation (Completed Jan 16, 2026)

Infrastructure and backend setup:

- Expo project with TypeScript
- Firebase SDK integration (Auth, Firestore, Storage, Functions)
- Type system: `user.ts`, `venue.ts`, `review.ts`, `social.ts`
- Firestore security rules with moderation checks
- Storage rules (images only, 5MB max)
- Cloud Functions: `onUserCreate`, `updateVenueRating`, moderation endpoints
- Services layer: `auth.ts`, `firestore.ts`, `storage.ts`, `geolocation.ts`
- API layer: `users.ts`, `venues.ts`, `reviews.ts`, `social.ts`
- Theme/constants: pride-inspired color palette, spacing, typography

---

## Phase 2: Authentication & User Management (Completed Jan 16, 2026)

Full auth system with moderation workflow:

- **State:** Zustand auth store with Firebase sync
- **Hooks:** `useAuth` with computed properties (isAuthenticated, isApproved, isPending, etc.)
- **Components:** Button, Input, LoadingSpinner (reusable)
- **Screens:** Login, Register, Password Reset, Profile Setup, Moderation Pending
- **Navigation:** Auth-state-based routing, tab bar (Explore, Favorites, Social, Profile)
- **Flow:** Register -> Email verify -> Cloud Function creates profile (pending) -> Admin approval -> App access

**Files created:** 15 | **Lines of code:** ~2,500

---

## Phase 3: Visual-First Geolocation Discovery (Completed Jan 16, 2026)

Image-driven venue discovery optimized for travelers:

- **Geolocation:** Auto-detect location, permission handling, nearby queries
- **Map:** React Native Maps with custom emoji markers per category
- **Cards:** 220px hero images, category badges, price/rating/distance at a glance
- **Filters:** Horizontal scroll filter bar with emoji icons (Resorts, Clubs, Bars, Restaurants, Events, Attractions) + price filter modal
- **Detail Screen:** Full-screen image gallery, quick actions (Directions, Call, Website, Share), check-in button
- **Map/List Toggle:** Instant switch between spatial and scrollable views
- **Sample Data:** 5 San Francisco/Palm Springs venues for testing

**Design philosophy:** "Zero reading. All visuals. Instant gratification." Large images, emoji categories, minimal text.

**Files created:** 18 | **Lines of code:** ~3,500

---

## Phase 4: Core Features (Completed Jan 2026, 95%)

All major consumer features implemented:

- **Reviews:** Write with ratings, display, helpful voting, sorting, moderation
- **Check-ins:** Flow, history, location verification
- **Favorites:** Add/remove, list view, persistent storage, toggle on cards
- **Offers:** Browse, claim, QR code redemption, time-limited, My Offers tab
- **Social:** Activity feed, friend check-ins, recent reviews

**Remaining:** Seed real venue data to Firestore, switch from sample data to live queries.

---

## Admin & Partner Dashboards (Jan 18, 2026)

### Admin Dashboard
- User registration approval/rejection
- Venue submission review and featuring
- Platform statistics
- Role-based access via Firebase custom claims

### Partner Dashboard
- User moderation (filter by status, approve/reject/revoke)
- Venue moderation (approve/reject, toggle featured)
- Review management (filter by rating, delete inappropriate)
- Analytics (7-day activity, category distribution, top 10 venues)
- Role management script (`set-partner-role.js`)

---

## Enhancements & Security Fixes (Jan 26, 2026)

### Critical Security Fixes

1. **Removed hardcoded secret fallbacks** in `setAdminClaim.ts` and `setPartnerClaim.ts`
   - Eliminated default `'CHANGE_ME_IN_PRODUCTION'` fallback
   - Returns 503 if secrets not configured
   - **Action required:** `firebase functions:config:set admin.bootstrap_secret="..." partner.bootstrap_secret="..."`

2. **Restricted CORS** on Cloud Functions
   - Replaced wildcard `*` with specific origin allowlist
   - Allowed: `localhost:3000`, `localhost:3001`, production domains
   - **Action required:** Update allowed origins for production domains

3. **Fixed timestamp mismatches** across all dashboards
   - Replaced `new Date()` with `serverTimestamp()` in all Firestore updates

### UX Enhancements

4. **Error boundaries** added to both dashboards (root + dashboard level)
5. **Toast notification system** in partner dashboard (success/error/warning/info, auto-dismiss, stacking)
6. **Loading skeletons** (CardSkeleton, TableSkeleton, DashboardSkeleton, VenueDetailSkeleton)
7. **Shared constants file** (`partner-dashboard/lib/constants.ts`) - eliminates magic numbers

### Known Remaining Issues

- `'system'` venue creation bypass still active in `firestore.rules` (remove after seeding)
- Admin email domain validation not enforced (`.env.local` has `ALLOWED_ADMIN_EMAIL_DOMAINS` but unused)
- Toast migration incomplete (venues, reviews, login pages still use `alert()`)
- No pagination on data queries
- No unit tests

### Priority Roadmap (as of Jan 26, 2026)

**Immediate:** Set Firebase secrets, remove system bypass after seeding, test fixes
**Short-term:** Email domain validation, form validation, finish toast migration
**Medium-term:** Pagination, shared types package (Zod), unit tests, Sentry
**Long-term:** Monorepo refactor, shared Firebase utilities, E2E tests, >70% coverage

---

## Activity-First Rebuild (September 2026)

The consumer app was refocused from a venue directory with a social feed to
a going-out app: pick an activity, see what's on, go.

### What changed

- **Events are the core unit.** Each event has one to three activities, a
  venue, start and end times, cover, tags, and an optional perk.
- **Activities are data.** They live in the `activities` collection and are
  managed by admins. A starting set of 26 is seeded by
  `pnpm --filter @community/admin-dashboard seed:activities`.
- **Browsing needs no account.** The app opens to What's on. Sign-in is asked
  for only when unlocking a perk at the door.
- **Partners post their own events** from the partner dashboard, with weekly
  repeat. Events publish immediately.
- **Perks unlock on arrival** (within 150 m), last 15 minutes, and are
  redeemed by staff pressing and holding a button on the person's phone.
- **New visual style:** light background, Nunito, and the six rainbow flag
  colors assigned to activities.

### What was removed

- Community feed, check-in posts, and likes
- Favorites, written reviews, and venue pages in the consumer app
- The old offers system (claim codes, QR, offer analytics)
- The approval step for new consumer accounts

Venues and reviews still exist in Firestore and in the dashboards.

### Server functions

- Run on Node.js 22 with `firebase-functions` 7 (first-generation functions)
- Built automatically before each deploy
- `setAdminClaim` and `setPartnerClaim` were removed. They relied on a
  configuration feature that no longer exists, and roles are granted with
  scripts instead.

### Still open

- Moderation pages in the partner dashboard should move to the admin dashboard
- `'system'` venue creation bypass is still in `firestore.rules`
- Busy level ("Filling up") is not yet calculated from real arrivals
- The Map tab is a nearest-first list; an interactive map needs native setup
- Event photo upload
- Push notifications

---

*Last consolidated: September 27, 2026*
*Sources: PROJECT_STATUS.md, PHASE_2_COMPLETE.md, PHASE_3_COMPLETE.md, PHASE_4_STATUS.md, ADMIN_ARCHITECTURE.md, ENHANCEMENTS_SUMMARY.md, SYSTEM_FIXES.md*
