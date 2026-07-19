# Community App - Testing Guide

Manual testing fundamentals and a complete Partner Dashboard test walkthrough.

---

## Testing Basics

Every test follows this pattern:

1. **Setup** — Get to the right state (open page, log in, etc.)
2. **Action** — Do something (click button, submit form)
3. **Expected** — What should happen
4. **Actual** — What actually happened
5. **Pass/Fail** — Did expected match actual?

### Essential Tools

**Browser DevTools (F12):**
- **Console:** Red errors = broken, yellow warnings = maybe a problem
- **Network:** Red requests = API/server error; status 200 = success, 400s = client error, 500s = server error
- **Network Throttling:** Set to "Slow 3G" to test loading states
- **Device Mode:** Click phone icon to test different screen sizes

### Bug Severity Guide

| Severity | Description | Example | Action |
|----------|-------------|---------|--------|
| Critical | Blocks main functionality | Can't log in, data loss | Stop and fix immediately |
| High | Major feature broken | Rapid clicking causes duplicates | Fix before production |
| Medium | Annoying but not blocking | Missing loading spinner | Fix when possible |
| Low | Cosmetic | Icon misaligned, typo | Fix in future update |

### Bug Report Template

```
BUG: [Short description]
SEVERITY: Critical/High/Medium/Low

STEPS TO REPRODUCE:
1. [Step]
2. [Step]

EXPECTED: [What should happen]
ACTUAL: [What actually happened]

ENVIRONMENT: Browser, OS, Date
WORKAROUND: [If any]
```

---

## Partner Dashboard Test Walkthrough

**URL:** http://localhost:3001
**Account:** cameron.fadjo@gmail.com (partner role)

### Quick Smoke Test (15 min)

1. Can you log in? Go to localhost:3001, enter credentials
2. Does dashboard load? Stats show numbers, no console errors?
3. Can you navigate? Click Users, Venues, Reviews, Analytics — pages load?
4. Can you take action? Approve one user, toast appears?

If all pass, continue to the full walkthrough below.

---

### Phase 1: Authentication

**Test 1.1 — Login:**
1. Navigate to localhost:3001
2. Enter credentials, click "Sign in"
3. Expected: Redirect to `/dashboard`, sidebar shows email and "Partner" badge, no console errors

**Test 1.2 — Error Boundary:**
1. Open Console (F12), type `throw new Error("Test")`
2. Expected: Professional error page (not blank), "Retry" button recovers the page

**Test 1.3 — Access Denied:**
1. Sign out, try logging in with a non-partner account
2. Expected: "Access denied. Partner account required."

---

### Phase 2: Dashboard Overview

**Test 2.1 — Stats:** 6 cards display with real counts (Total Users, Pending Users, Total Venues, Pending Venues, Approved Venues, Total Reviews)

**Test 2.2 — Loading Skeletons:** Throttle to "Slow 3G", refresh. Gray animated skeleton cards should appear instantly, then transition smoothly to real data.

**Test 2.3 — Alert Banner:** Yellow if pending items exist, green "All caught up!" if none.

---

### Phase 3: User Moderation

**Test 3.1 — User List:** Table shows avatar, name, email, date, status badge (yellow=pending, green=approved, red=rejected), action buttons.

**Test 3.2 — Filters:** Click All | Pending | Approved | Rejected. Active filter has purple background, list updates correctly.

**Test 3.3 — Approve User:**
1. Filter to "Pending", click "Approve"
2. Expected: Green toast bottom-right ("User approved successfully"), auto-dismisses after 5s, badge turns green, user moves to Approved filter

**Test 3.4 — Reject User:** Click "Reject". Toast confirms, badge turns red.

**Test 3.5 — Multiple Toasts:** Quickly approve 3 users. 3 toasts should stack vertically, all readable, oldest dismisses first.

**Test 3.6 — Error Toast:** Go offline (Network tab > Offline), try to approve. Red toast: "Failed to update user status." User status unchanged. Go online, retry — should succeed.

---

### Phase 4: Venue Moderation

**Test 4.1 — Layout:** Two-panel: venue list (left), details (right). Cards show name, category emoji, location, status, rating.

**Test 4.2 — Venue Details:** Click a venue. Right panel shows full info: name, category, description, address, contact, price, rating, created date, action buttons.

**Test 4.3 — Approve Venue:** Select pending venue, click "Approve Venue". Green toast, status changes.

**Test 4.4 — Toggle Featured:** On approved venue, click "Make Featured". Yellow Featured badge appears, button changes to "Remove Featured". Click again to unfeatre.

---

### Phase 5: Reviews

**Test 5.1 — Display:** Two-panel layout. Reviews show star rating, venue name, reviewer, preview text, date, helpful count.

**Test 5.2 — Filter by Rating:** All | 5★ | 4★ | 3★ | 2★ | 1★. Filters correctly.

**Test 5.3 — Delete Review:** Click review, click "Delete Review". Confirmation dialog appears. OK = deleted, Cancel = kept.

---

### Phase 6: Analytics

**Test 6.1 — Recent Activity:** 3 cards showing last 7 days: New Users, New Venues, New Reviews.

**Test 6.2 — Category Distribution:** Grid with category emoji + count for each populated category.

**Test 6.3 — Top Venues Table:** Top 10 by rating. Columns: rank, name, category, price, rating, reviews, new reviews (7d), featured badge.

---

### Phase 7: Navigation & Sign Out

**Test 7.1 — Sidebar:** Logo, menu items (Dashboard, Users, Venues, Reviews, Analytics), current page highlighted purple, email and "Partner" badge at bottom.

**Test 7.2 — Sign Out:** Click "Sign Out". Redirects to `/login`, session cleared, can't access `/dashboard` without signing in again.

---

### Phase 8: Edge Cases

- **Empty data:** Stats show 0, pages show "No X found", no crashes
- **Long names:** Truncated with ellipsis, no layout breakage
- **Special characters:** Emojis, accents, apostrophes display correctly
- **Rapid clicking:** Ideally processes once with button disabled during API call (known issue: may double-process)

---

### Testing Report Template

```
PARTNER DASHBOARD TESTING REPORT
Date: [Date]
Tester: [Name]
Environment: Development (localhost:3001)

PASSED: X/Y
FAILED: X/Y

FAILED TESTS:
- [Test name]: [Issue description, steps to reproduce]

BUGS FOUND:
- [Description] — Severity: [Critical/High/Medium/Low]

READY FOR PRODUCTION: YES/NO
Blockers: [If NO, list blockers]
```

---

*Last consolidated: March 30, 2026*
*Sources: TESTING_101.md, TESTING_WALKTHROUGH.md*
