# Partner Dashboard

A Next.js-based admin dashboard for the Community App, providing moderation and analytics capabilities for partner administrators.

## Features

- **User Moderation** - Review and approve/reject user registrations
- **Venue Moderation** - Review venue submissions and manage featured status
- **Review Management** - View and moderate user reviews
- **Analytics Dashboard** - Platform insights and performance metrics
- **Role-Based Access** - Secure access with custom Firebase claims

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Firebase** - Authentication and Firestore database
- **Tailwind CSS** - Styling
- **date-fns** - Date formatting

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

## Testing Walkthrough

### Step 1: Login

1. Navigate to `http://localhost:3001/login`
2. Enter your email and password
3. Click "Sign in"
4. If successful, you'll be redirected to the dashboard
5. If you see "Access denied", you need to set the partner role (see Setup step 4)

### Step 2: Dashboard Overview

The main dashboard (`http://localhost:3001/dashboard`) displays:

- **Total Users** - Count of all registered users
- **Pending Users** - Users awaiting moderation
- **Total Venues** - All submitted venues
- **Pending Venues** - Venues awaiting approval
- **Approved Venues** - Live venues on the platform
- **Total Reviews** - All user reviews

Quick action cards provide direct navigation to moderation pages.

### Step 3: User Moderation

Navigate to `http://localhost:3001/dashboard/users`

**Test Cases:**
1. **Filter by status**: Try All, Pending, Approved, and Rejected filters
2. **Approve a pending user**: Click "Approve" button
3. **Reject a user**: Click "Reject" button
4. **Revoke approval**: For approved users, click "Revoke"
5. **Re-approve rejected user**: For rejected users, click "Approve"

**Expected Behavior:**
- Status updates immediately
- User list refreshes after action
- Counts update in dashboard stats

### Step 4: Venue Moderation

Navigate to `http://localhost:3001/dashboard/venues`

**Test Cases:**
1. **Filter venues**: Test All, Pending, Approved, Rejected filters
2. **View venue details**: Click on a venue to see full details
3. **Approve pending venue**: Select pending venue, click "✓ Approve Venue"
4. **Reject venue**: Click "✗ Reject Venue"
5. **Feature venue**: For approved venues, click "⭐ Make Featured"
6. **Remove featured status**: Click "⭐ Remove Featured"
7. **Revoke approval**: Click "Revoke Approval" for approved venues

**Expected Behavior:**
- Details panel shows on the right
- All venue information displays correctly
- Actions update status immediately
- Featured badge appears/disappears as expected

### Step 5: Review Management

Navigate to `http://localhost:3001/dashboard/reviews`

**Test Cases:**
1. **Filter by rating**: Test All, 5★, 4★, 3★, 2★, 1★ filters
2. **View review details**: Click on a review
3. **Check review images**: If review has photos, they should display
4. **Delete review**: Click "🗑️ Delete Review" and confirm

**Expected Behavior:**
- Reviews load with venue and user names
- Star ratings display correctly
- Review text shows in full when selected
- Deletion requires confirmation

### Step 6: Analytics

Navigate to `http://localhost:3001/dashboard/analytics`

**Features to Verify:**
1. **Recent Activity (Last 7 Days)**
   - New users count
   - New venues count
   - New reviews count

2. **Venues by Category**
   - Distribution chart showing venues per category
   - Category icons display correctly

3. **Top Rated Venues**
   - Table sorted by rating
   - Shows venue details, rating, review count
   - Recent reviews (7 days) column
   - Featured badge for featured venues

### Step 7: Navigation and UI

**Test Cases:**
1. **Sidebar navigation**: Click each menu item
2. **Active route highlighting**: Verify current page is highlighted
3. **User info display**: Check email and role ("Partner") display correctly
4. **Sign out**: Click sign out button, verify redirect to login
5. **Responsive design**: Resize browser window

## Common Issues and Solutions

### "Access denied. Partner account required."

**Solution**: You need to set the partner role for your account:
```bash
node scripts/set-partner-role.js set your-email@example.com
```
Then sign out and sign back in.

### "Error loading stats/venues/users"

**Possible causes:**
1. **Firestore security rules not configured** - Need to allow partner role to read data
2. **Collection doesn't exist yet** - Create test data in Firestore
3. **Index not created** - Check Firebase Console for index creation prompts

### Environment variables not loading

**Solution**:
- Ensure `.env.local` exists in `partner-dashboard` directory
- Restart the development server after creating/modifying `.env.local`
- Verify all `NEXT_PUBLIC_` prefixes are present

### Can't sign in after setting partner role

**Solution**:
- Sign out completely from the app
- Clear browser cache/cookies
- Sign in again to refresh the token with new claims

## Security Notes

1. **Never commit sensitive files:**
   - `serviceAccountKey.json`
   - `.env.local`
   - Any files with API keys or secrets

2. **Firestore Security Rules:**
   - Ensure only users with `role === 'partner'` can access admin data
   - Protect write operations to critical collections

3. **Role Management:**
   - Only grant partner role to trusted administrators
   - Regularly audit partner access using the list command:
     ```bash
     node scripts/set-partner-role.js list
     ```

## Development

### Project Structure

```
partner-dashboard/
├── app/
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── analytics/      # Analytics page
│   │   ├── reviews/        # Review management
│   │   ├── users/          # User moderation
│   │   ├── venues/         # Venue moderation
│   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   └── page.tsx        # Dashboard overview
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── lib/
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Auth state management
│   └── firebase/           # Firebase configuration
│       ├── config.ts       # Firebase initialization
│       └── auth.ts         # Auth helpers
├── scripts/                # Admin scripts
│   ├── set-partner-role.js # Partner role management
│   └── README.md           # Scripts documentation
├── types/                  # TypeScript definitions
│   └── index.ts           # Shared types
└── README.md              # This file
```

### Available Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server (port 3001)
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new route in `app/dashboard/`
2. Add navigation link in `app/dashboard/layout.tsx`
3. Update types in `types/index.ts` if needed
4. Test with different user states (pending, approved, etc.)

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Test production build locally:**
   ```bash
   npm start
   ```

3. **Deploy to hosting platform** (Vercel, Firebase Hosting, etc.)

4. **Set environment variables** in production:
   - Add all `NEXT_PUBLIC_*` variables
   - Ensure Firebase project matches production

5. **Configure Firestore security rules** for production

## Support

For issues or questions:
1. Check this README first
2. Review Firebase Console for errors
3. Check browser console for client-side errors
4. Verify environment variables are set correctly

## What's Next?

Potential enhancements:
- Email notifications for moderation actions
- Bulk actions (approve/reject multiple items)
- Advanced filtering and search
- Export analytics data
- User activity logs
- More detailed venue analytics
