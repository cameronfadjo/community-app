import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  useFonts,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { useAuth } from '../src/hooks';
import { LoadingSpinner } from '../src/components';
import { usePerkStore } from '../src/store/perkStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { configureNotifications, onNotificationOpened } from '../src/services/notifications';
import { COLORS } from '../src/constants/theme';

configureNotifications();

export default function RootLayout() {
  const { isAuthenticated, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  // Browsing is open to everyone. Signing in is only needed for perks, so the
  // one redirect left is moving signed-in people off the sign-in screens.
  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (isAuthenticated && segments[0] === 'auth') {
      // Someone who signed in to unlock a perk goes back to that event
      const { pendingReturnPath, setPendingReturnPath } = usePerkStore.getState();
      setPendingReturnPath(null);
      router.replace((pendingReturnPath ?? '/(tabs)/whats-on') as never);
    }
  }, [isAuthenticated, initialized, segments]);

  // Refresh what is scheduled each time the app opens, and open the event
  // when a nudge is tapped
  useEffect(() => {
    const { load, reschedule } = useNotificationStore.getState();
    load().then(reschedule);

    return onNotificationOpened((eventId) => {
      router.push((eventId ? `/event/${eventId}` : '/(tabs)/whats-on') as never);
    });
  }, []);

  // If the font fails to load, carry on with the system font
  if (!fontsLoaded && !fontError) {
    return <LoadingSpinner fullScreen message="Loading Community..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="pick" options={{ presentation: 'modal' }} />
      <Stack.Screen name="account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
