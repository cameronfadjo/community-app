# Community Admin Dashboard

Modern admin dashboard for moderating users, venues, and content on the Community platform.

## Features

- **User Moderation**: Approve/reject user registrations
- **Venue Moderation**: Review and approve venue submissions
- **Featured Venues**: Mark venues as featured
- **Dashboard Overview**: View platform statistics
- **Role-Based Access**: Secure admin-only access with custom claims

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Firestore database
- **date-fns** - Date formatting

## Getting Started

### 1. Install Dependencies

```bash
cd admin-dashboard
npm install
```

### 2. Environment Variables

The `.env.local` file is already configured with your Firebase credentials.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First-Time Setup: Approve Yourself as Admin

Since security rules prevent client-side approval, you need to manually approve yourself in Firebase Console:

### Option A: Firebase Console (Recommended)

1. Go to [Firebase Console - Firestore](https://console.firebase.google.com/project/community-86792/firestore/databases/-default-/data/~2Fusers~2FWPj34qoXNEPvkvjfsTcqoJnHmzo1)

2. Click on your user document (`WPj34qoXNEPvkvjfsTcqoJnHmzo1`)

3. Edit the document:
   - Change `moderationStatus` from `pending` to `approved`
   - Change `verified` from `false` to `true`

4. Click **Update**

5. **Refresh the Community app** (localhost:8081) - you should now have access!

### Option B: Set Admin Custom Claim (For Admin Dashboard Access)

To access the **admin dashboard**, you need custom claims. This requires Firebase CLI:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Run the following command (replace with your email):
   ```bash
   firebase auth:export users.json --project community-86792
   # Find your UID in the exported file
   ```

4. Use Firebase Admin SDK to set custom claims:

   - Download a service account key from the [Firebase Console](https://console.firebase.google.com/project/community-86792/settings/serviceaccounts/adminsdk)
   - From the repository root, with `GOOGLE_APPLICATION_CREDENTIALS` set to the key's path:
     ```bash
     pnpm --filter @community/admin-dashboard set-admin set email@example.com
     ```
   - See `docs/OPERATIONS.md` for details

## Admin Dashboard Pages

### Dashboard (`/dashboard`)
- Overview of platform statistics
- Pending items requiring attention
- Quick action links

### Users (`/dashboard/users`)
- View all users
- Filter by moderation status (pending, approved, rejected)
- Approve/reject users
- Revoke approvals

### Venues (`/dashboard/venues`)
- View all venue submissions
- Filter by moderation status
- Approve/reject venues
- Toggle featured status
- View full venue details

### Reviews (`/dashboard/reviews`)
- Coming soon: Moderate flagged reviews

### Analytics (`/dashboard/analytics`)
- Coming soon: Platform analytics and insights

## Security Model

The admin dashboard uses Firebase custom claims for role-based access control:

```typescript
// Custom claims structure
{
  role: 'admin',
  permissions: [
    'moderate_users',
    'moderate_venues',
    'moderate_content',
    'manage_partners',
    'view_analytics',
    'manage_admins'
  ]
}
```

### How It Works

1. **Authentication**: Users sign in with email/password
2. **Custom Claims Check**: Auth context verifies `role === 'admin'`
3. **Auto-Redirect**: Non-admins are automatically signed out
4. **Firestore Security**: Server-side rules enforce admin-only access

## Development

### Project Structure

```
admin-dashboard/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   ├── page.tsx             # Overview page
│   │   ├── users/page.tsx       # User moderation
│   │   └── venues/page.tsx      # Venue moderation
│   ├── login/page.tsx           # Login page
│   ├── layout.tsx               # Root layout with AuthProvider
│   └── page.tsx                 # Redirect to login or dashboard
├── lib/
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state management
│   └── firebase/
│       ├── config.ts            # Firebase initialization
│       └── auth.ts              # Auth helpers
├── types/
│   └── index.ts                 # TypeScript definitions
└── .env.local                   # Environment variables
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set custom domain: `admin.community.com`
4. Add environment variables from `.env.local`
5. Deploy

### Other Platforms

- **Netlify**: Works with Next.js adapter
- **Firebase Hosting**: Use `firebase deploy --only hosting:admin`

## Next Steps

1. **Approve yourself** using Firebase Console (see above)
2. **Test the consumer app** - verify you can access all features
3. **Upgrade to Blaze plan** - enables Cloud Functions for advanced admin features
4. **Deploy Cloud Functions** - for automatic admin claim management
5. **Build Partner Dashboard** - for venue owners to manage their listings

## Architecture

See `ADMIN_ARCHITECTURE.md` in the parent directory for:
- Full multi-app architecture plan
- Partner dashboard design
- Cloud Functions for moderation
- Security rules and custom claims
- Phase-by-phase implementation guide

## Support

For issues or questions:
1. Check Firebase Console for errors
2. Review browser console logs
3. Verify custom claims are set correctly
4. Ensure Firestore security rules are deployed

## License

Private - Internal use only
