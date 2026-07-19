# Community App - Quick Setup Guide

This guide will help you get the Community app up and running on your local machine.

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] npm or yarn package manager
- [ ] Git installed
- [ ] A Firebase account ([Sign up free](https://firebase.google.com/))
- [ ] A code editor (VS Code recommended)

## Step-by-Step Setup

### Step 1: Install Global Dependencies

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### Step 2: Install Project Dependencies

```bash
# Navigate to the project directory
cd "Community App/Community"

# Install all dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### Step 3: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**

2. **Create a new project:**
   - Click "Add project"
   - Name it "Community" (or your preferred name)
   - Disable Google Analytics (optional for development)
   - Click "Create project"

3. **Enable Authentication:**
   - Go to "Authentication" in the left sidebar
   - Click "Get started"
   - Enable "Email/Password" sign-in method
   - (Optional) Enable "Google" and "Apple" for social login

4. **Create Firestore Database:**
   - Go to "Firestore Database" in the left sidebar
   - Click "Create database"
   - Start in "production mode"
   - Choose a location (closest to your users)

5. **Set up Storage:**
   - Go to "Storage" in the left sidebar
   - Click "Get started"
   - Start in "production mode"
   - Use the default bucket

6. **Enable Hosting (for web):**
   - Go to "Hosting" in the left sidebar
   - Click "Get started"
   - Follow the wizard

### Step 4: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon (`</>`) to add a web app
5. Register app with nickname "Community Web"
6. Copy the `firebaseConfig` object

### Step 5: Configure Environment Variables

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your Firebase config:**
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Step 6: Initialize Firebase in Your Project

```bash
# Initialize Firebase (from project root)
firebase init

# Select the following options:
# ✓ Firestore
# ✓ Functions
# ✓ Hosting
# ✓ Storage

# When prompted:
# - Select your Firebase project from the list
# - Use existing files for rules and indexes
# - For Functions, choose TypeScript
# - Use existing functions directory
# - For Hosting, use 'dist' as public directory
```

### Step 7: Deploy Firebase Rules and Functions

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Storage security rules
firebase deploy --only storage:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Build and deploy Cloud Functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Step 8: Run the App

```bash
# Start the Expo development server
npm start

# This will open Expo DevTools in your browser
# From there you can:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web browser
# - Scan QR code with Expo Go app on your phone
```

## Platform-Specific Setup

### iOS Development (macOS only)

1. **Install Xcode from App Store**
2. **Install iOS Simulator:**
   ```bash
   xcode-select --install
   ```
3. **Run on iOS:**
   ```bash
   npm run ios
   ```

### Android Development

1. **Install Android Studio**
2. **Set up Android emulator:**
   - Open Android Studio
   - Go to Tools → AVD Manager
   - Create a new virtual device
3. **Run on Android:**
   ```bash
   npm run android
   ```

### Web Development

```bash
# Run on web browser
npm run web
```

## Verify Your Setup

### 1. Test Authentication

1. Run the app: `npm start`
2. Create a new account with email/password
3. Check Firebase Console → Authentication
4. You should see the new user listed

### 2. Test Firestore

1. In Firebase Console → Firestore Database
2. You should see a `users` collection
3. Your user document should be there with `moderationStatus: 'pending'`

### 3. Test Cloud Functions

1. Check Firebase Console → Functions
2. You should see deployed functions:
   - `onUserCreate`
   - `updateVenueRating`
   - `moderateUser`
   - `moderateVenue`

## Common Setup Issues

### Issue: "Firebase not initialized"

**Solution:**
- Make sure `.env` file exists in project root
- Verify all environment variables are set correctly
- Restart the development server: `npm start`

### Issue: "Module not found" errors

**Solution:**
```bash
# Clear Metro bundler cache
npx expo start -c

# Or reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: iOS build fails

**Solution:**
```bash
# Navigate to iOS folder (if it exists)
cd ios
pod install
cd ..

# Or use Expo's prebuild
npx expo prebuild --platform ios
```

### Issue: Android emulator not detected

**Solution:**
- Ensure Android emulator is running
- Check ANDROID_HOME environment variable is set
- Restart ADB: `adb kill-server && adb start-server`

### Issue: Cloud Functions deployment fails

**Solution:**
```bash
# Make sure you're logged into Firebase
firebase login

# Check if you're in the right project
firebase use --add

# Build functions before deploying
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## Next Steps

Once your setup is complete:

1. **Review the Architecture:**
   - Read `README.md` for project overview
   - Review `/src/types` for data models
   - Explore `/src/services` for business logic

2. **Start Development:**
   - Create authentication screens in `/app/(auth)`
   - Build venue discovery in `/app/(tabs)/explore.tsx`
   - Implement components in `/src/components`

3. **Test Your Work:**
   - Test on multiple platforms (iOS, Android, Web)
   - Verify Firebase rules are working correctly
   - Check Cloud Functions logs

## Development Tips

- **Hot Reload:** Save files and see changes instantly
- **Debugging:** Use React DevTools and Chrome DevTools
- **Firebase Emulators:** Use local emulators for development (see README)
- **Version Control:** Commit frequently, never commit `.env` file

## Getting Help

- **Documentation:** See `README.md` for detailed information
- **Firebase Docs:** [firebase.google.com/docs](https://firebase.google.com/docs)
- **Expo Docs:** [docs.expo.dev](https://docs.expo.dev)
- **React Native Docs:** [reactnative.dev](https://reactnative.dev)

## Success Checklist

- [ ] Project dependencies installed
- [ ] Firebase project created and configured
- [ ] Environment variables set in `.env`
- [ ] Firebase rules and functions deployed
- [ ] App runs on at least one platform
- [ ] Can create a user account
- [ ] User appears in Firestore with correct status

---

**Congratulations!** Your Community app is ready for development. Start building amazing features for the LGBTQ+ community! 🌈
