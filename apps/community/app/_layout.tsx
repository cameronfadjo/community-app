import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks';
import { LoadingSpinner } from '../src/components';

export default function RootLayout() {
  const { isAuthenticated, isApproved, isPending, isRejected, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      // Not authenticated - redirect to login
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
    } else {
      // Authenticated - check moderation status
      if (isPending || isRejected) {
        // Pending or rejected moderation - show moderation screen
        if ((segments as string[])[1] !== 'moderation-pending') {
          router.replace('/auth/moderation-pending');
        }
      } else if (isApproved) {
        // Approved - allow access to main app
        if (inAuthGroup) {
          router.replace('/(tabs)/explore');
        }
      }
    }
  }, [isAuthenticated, isApproved, isPending, isRejected, initialized, segments]);

  if (!initialized) {
    return <LoadingSpinner fullScreen message="Loading Community..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}
