# Developer Quick Reference Guide

## Quick Start Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web

# Type checking
npm run type-check

# Deploy Firebase
npm run firebase:rules      # Deploy security rules
npm run firebase:functions  # Deploy Cloud Functions
npm run firebase:hosting    # Deploy web app
```

## Project Structure Reference

```
Community/
├── app/                    # Screens (Expo Router)
│   ├── _layout.tsx        # Root navigation with auth logic
│   ├── index.tsx          # Entry point
│   ├── (tabs)/            # Main app tabs (protected)
│   │   ├── explore.tsx    # Venue discovery
│   │   ├── favorites.tsx  # Saved venues
│   │   ├── social.tsx     # Community feed
│   │   └── profile.tsx    # User profile
│   └── auth/              # Authentication screens
│       ├── login.tsx
│       ├── register.tsx
│       ├── reset-password.tsx
│       ├── profile-setup.tsx
│       └── moderation-pending.tsx
│
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── hooks/             # Custom React hooks
│   │   └── useAuth.ts
│   │
│   ├── store/             # State management (Zustand)
│   │   └── authStore.ts
│   │
│   ├── services/          # Business logic
│   │   ├── firebase/      # Firebase services
│   │   │   ├── auth.ts
│   │   │   ├── firestore.ts
│   │   │   ├── storage.ts
│   │   │   └── geolocation.ts
│   │   └── api/           # API layer
│   │       ├── users.ts
│   │       ├── venues.ts
│   │       ├── reviews.ts
│   │       └── social.ts
│   │
│   ├── types/             # TypeScript definitions
│   │   ├── user.ts
│   │   ├── venue.ts
│   │   ├── review.ts
│   │   └── social.ts
│   │
│   ├── constants/         # App constants
│   │   ├── categories.ts
│   │   ├── priceRanges.ts
│   │   └── theme.ts
│   │
│   └── utils/             # Utility functions (future)
│
├── functions/             # Firebase Cloud Functions
│   └── src/
│       ├── auth/
│       ├── moderation/
│       └── triggers/
│
├── firebase.json          # Firebase config
├── firestore.rules        # Database security
├── storage.rules          # Storage security
└── .env                   # Environment variables
```

## Common Tasks

### Adding a New Screen

1. Create file in `app/` directory
2. Use existing components from `src/components`
3. Access auth state with `useAuth()` hook
4. Style with theme constants

Example:
```typescript
import { View, Text } from 'react-native';
import { useAuth } from '../src/hooks';
import { Button } from '../src/components';
import { COLORS, SPACING } from '../src/constants/theme';

export default function MyScreen() {
  const { user, profile } = useAuth();

  return (
    <View>
      <Text>Hello {profile?.displayName}!</Text>
    </View>
  );
}
```

### Adding a New Component

1. Create file in `src/components/`
2. Export from `src/components/index.ts`
3. Use theme constants for consistency

Example:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';

interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <View style={styles.container}>{/* ... */}</View>;
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
});
```

### Using Firebase Services

```typescript
// Import service
import { createVenue } from '../src/services/api/venues';

// Use in component
const handleCreateVenue = async () => {
  try {
    const venueId = await createVenue({
      name: 'My Venue',
      // ... other fields
    });
    console.log('Created venue:', venueId);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Managing State

```typescript
// For global state, create a new store
import { create } from 'zustand';

interface VenueState {
  venues: Venue[];
  loading: boolean;
  fetchVenues: () => Promise<void>;
}

export const useVenueStore = create<VenueState>((set) => ({
  venues: [],
  loading: false,
  fetchVenues: async () => {
    set({ loading: true });
    // Fetch logic
    set({ loading: false });
  },
}));
```

## Styling Guidelines

### Use Theme Constants

```typescript
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,              // Use spacing scale
    backgroundColor: COLORS.background, // Use color palette
  },
  title: {
    fontSize: FONT_SIZES.xl,          // Use font sizes
    fontWeight: FONT_WEIGHTS.bold,    // Use font weights
    color: COLORS.text,
  },
});
```

### Spacing Scale
- `xs`: 4px
- `sm`: 8px
- `md`: 16px (most common)
- `lg`: 24px
- `xl`: 32px
- `xxl`: 48px

### Color Palette
- `primary`: Main brand color (pink)
- `secondary`: Secondary brand color (purple)
- `text`: Main text color
- `textSecondary`: Secondary text
- `background`: Page background
- `surface`: Card/surface background
- `error`: Error messages
- `success`: Success messages

## Firebase Development

### Testing Locally with Emulators

```bash
# Install emulators
firebase init emulators

# Start emulators
firebase emulators:start

# Update config to use emulators (in development)
# See Firebase docs for configuration
```

### Deploying to Production

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

### Viewing Logs

```bash
# Cloud Functions logs
firebase functions:log

# Firestore usage
firebase firestore:delete --all-collections  # WARNING: Deletes all data
```

## Debugging Tips

### Check Auth State

```typescript
const { user, profile, isAuthenticated, isApproved } = useAuth();

console.log('User:', user);
console.log('Profile:', profile);
console.log('Is authenticated:', isAuthenticated);
console.log('Is approved:', isApproved);
```

### Clear Metro Bundler Cache

```bash
npx expo start -c
```

### Reset to Clean State

```bash
# Remove dependencies
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Clear cache and restart
npx expo start -c
```

## TypeScript Tips

### Import Types

```typescript
import { User, Venue, Review } from '../types';

// Use in component
interface Props {
  user: User;
  venue: Venue;
}
```

### Type Safety with Forms

```typescript
import { useForm } from 'react-hook-form';

interface LoginForm {
  email: string;
  password: string;
}

const { handleSubmit, control } = useForm<LoginForm>();

const onSubmit = (data: LoginForm) => {
  // data is typed!
  console.log(data.email);
};
```

## Common Patterns

### Loading States

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    // Fetch data
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};

return loading ? <LoadingSpinner /> : <Content />;
```

### Error Handling

```typescript
try {
  await someOperation();
} catch (error: any) {
  Alert.alert('Error', error.message || 'Something went wrong');
}
```

### Navigation

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate
router.push('/venue/123');

// Go back
router.back();

// Replace (no back stack)
router.replace('/auth/login');
```

## Best Practices

### 1. Never Commit Secrets
- `.env` is in `.gitignore`
- Never commit Firebase config directly
- Use environment variables

### 2. Use TypeScript
- All files should be `.ts` or `.tsx`
- Define interfaces for props
- Use type imports from `/src/types`

### 3. Follow Naming Conventions
- Components: PascalCase (`Button.tsx`)
- Hooks: camelCase with 'use' prefix (`useAuth.ts`)
- Constants: UPPER_SNAKE_CASE (`COLORS.PRIMARY`)
- Functions: camelCase (`fetchVenues`)

### 4. Keep Components Small
- One component per file
- Extract logic to hooks
- Extract business logic to services

### 5. Use Constants
- Don't hardcode colors, spacing, etc.
- Import from `src/constants/theme`

### 6. Error Boundaries
- Wrap screens in error boundaries
- Provide fallback UI
- Log errors for debugging

## Testing Checklist

Before committing:
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] App runs on at least one platform
- [ ] No console errors
- [ ] Forms validate correctly
- [ ] Navigation works
- [ ] Loading states show
- [ ] Error messages display

## Getting Help

- **Firebase Issues**: Check Firebase Console logs
- **Expo Issues**: See Expo documentation
- **TypeScript Errors**: Check type definitions in `/src/types`
- **Navigation**: See Expo Router docs
- **Styling**: Check theme constants

## Useful Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Firebase Docs](https://firebase.google.com/docs)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com)

---

Happy coding! 🌈
