# Community - LGBTQ+ Vacation Experience Guide

A cross-platform mobile and web application that helps LGBTQ+ travelers discover safe, welcoming resorts, clubs, restaurants, and experiences worldwide using geolocation.

## Features

- **Geolocation-based Discovery**: Find LGBTQ+-friendly venues near you
- **User Reviews & Ratings**: Read and share experiences with the community
- **Social Features**: Check-in at venues, share photos, and connect with others
- **Favorites**: Save your favorite venues for future reference
- **Price Range Filtering**: Discover experiences across all budgets
- **User Verification**: Moderated community ensuring quality and safety
- **Cross-Platform**: Works on iOS, Android, and Web

## Tech Stack

### Frontend
- **Expo** - Cross-platform development framework
- **React Native** - Mobile UI
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **React Native Maps** - Geolocation and maps
- **Zustand** - State management

### Backend
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - Database
- **Firebase Storage** - Image storage
- **Firebase Cloud Functions** - Serverless backend
- **Firebase Hosting** - Web hosting

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Git](https://git-scm.com/)

For mobile development:
- **iOS**: Xcode (macOS only)
- **Android**: Android Studio

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Community
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable the following services:
   - **Authentication**: Enable Email/Password provider
   - **Firestore Database**: Create in production mode
   - **Storage**: Set up with default settings
   - **Hosting**: Initialize (for web deployment)

#### Get Firebase Configuration

1. In Firebase Console, go to Project Settings
2. Under "Your apps", click the web icon (</>)
3. Register your app and copy the configuration

#### Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase configuration in `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

### 4. Deploy Firebase Security Rules

Deploy Firestore and Storage security rules:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only firestore:indexes
```

### 5. Set Up Cloud Functions

```bash
cd functions
npm install
cd ..
```

Build and deploy Cloud Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 6. Run the App

#### Development Mode (Expo Go)

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

#### Production Builds

For iOS and Android production builds, you'll need to set up [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Project Structure

```
Community/
├── app/                    # Application screens (Expo Router)
├── src/
│   ├── components/        # Reusable UI components
│   ├── services/          # Business logic
│   │   ├── firebase/     # Firebase services
│   │   └── api/          # API layer
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── constants/        # App constants and theme
│   └── store/            # State management
├── functions/            # Firebase Cloud Functions
├── assets/              # Images and static files
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
└── README.md
```

## Key Directories

### `/src/services`
Contains all business logic and Firebase integrations:
- **firebase/**: Core Firebase services (auth, firestore, storage, geolocation)
- **api/**: Higher-level API functions for users, venues, reviews, social features

### `/src/types`
TypeScript type definitions for all data models:
- `user.ts` - User profiles and authentication
- `venue.ts` - Venues and locations
- `review.ts` - Reviews and ratings
- `social.ts` - Check-ins and social features

### `/functions`
Firebase Cloud Functions for:
- User creation and moderation
- Venue approval workflow
- Automatic rating calculations
- Push notifications

## Development Workflow

### Adding a New Feature

1. **Create types** in `/src/types`
2. **Add Firebase service** in `/src/services/firebase`
3. **Create API functions** in `/src/services/api`
4. **Build UI components** in `/src/components`
5. **Create screens** in `/app`

### Testing

```bash
# Run tests (when configured)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Firebase Emulators (Local Development)

To develop without hitting production Firebase:

```bash
# Install Firebase emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

Update your Firebase config to use emulators in development.

## Deployment

### Web Deployment (Firebase Hosting)

```bash
# Build for web
npx expo export --platform web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Mobile App Deployment

#### iOS (App Store)

1. Configure EAS Build for iOS
2. Build: `eas build --platform ios`
3. Submit: `eas submit --platform ios`

#### Android (Google Play)

1. Configure EAS Build for Android
2. Build: `eas build --platform android`
3. Submit: `eas submit --platform android`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Measurement ID |

## Security

### Firestore Rules
- Users can only read approved profiles
- Venues require approval before being visible
- Users can only edit their own content
- Reviews are public but creation requires authentication

### Storage Rules
- Profile photos: Only owner can upload
- Venue images: Any authenticated user
- File size limit: 5MB
- Only image files allowed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Submit a pull request

## Moderation

### User Moderation
New users are set to "pending" status automatically. Admins can approve/reject via Cloud Functions.

### Venue Moderation
User-submitted venues require admin approval before appearing in the app.

## Troubleshooting

### Common Issues

**Firebase not initialized**
- Ensure `.env` file exists with correct Firebase config
- Restart the development server after changing `.env`

**Maps not showing**
- Check that location permissions are granted
- Verify Google Maps API key (if using)

**Cloud Functions errors**
- Check Firebase Functions logs: `firebase functions:log`
- Ensure functions are deployed: `firebase deploy --only functions`

**Build errors**
- Clear cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## License

This project is licensed under the MIT License.

## Support

For questions or issues:
- Check existing GitHub issues
- Create a new issue with details
- Contact the development team

## Roadmap

### Phase 1 (Current)
- ✅ Core infrastructure
- ✅ Firebase setup
- ✅ Type definitions
- ✅ Service layer

### Phase 2 (Next)
- [ ] Authentication screens
- [ ] Venue discovery
- [ ] Reviews system
- [ ] Social features

### Phase 3 (Future)
- [ ] Premium subscriptions
- [ ] Advanced filters
- [ ] Trip planning
- [ ] Offline mode
- [ ] Multi-language support

## Acknowledgments

Built with love for the LGBTQ+ community.
