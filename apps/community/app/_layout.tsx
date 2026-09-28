import React, { useEffect } from 'react';
import { AppState } from 'react-native';
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
import { useEventStore } from '../src/store/eventStore';
import { useSavedStore } from '../src/store/savedStore';
import { useWelcomeStore } from '../src/store/welcomeStore';
import { needsAgeConfirmation } from '../src/types';
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
  // If the font fails to load, carry on with the system font
  const fontsReady = fontsLoaded || !!fontError;

  const { confirmedAdult, loaded: welcomeLoaded, load: loadWelcome } = useWelcomeStore();

  useEffect(() => {
    loadWelcome();
  }, [loadWelcome]);

  // The app is for adults. Everyone confirms once, the first time it opens.
  const mustConfirmAge =
    welcomeLoaded && needsAgeConfirmation({ confirmed: confirmedAdult, firstSegment: segments[0] });

  // Checked on every change of screen, so no redirect or link can slip past
  useEffect(() => {
    if (mustConfirmAge && fontsReady) {
      router.replace('/welcome' as never);
    }
  }, [mustConfirmAge, fontsReady, segments]);

  // Browsing needs no account. Signing in is only needed for perks, so the
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
  // when a nudge or a reminder is tapped
  useEffect(() => {
    const prepare = async () => {
      const notifications = useNotificationStore.getState();
      const saved = useSavedStore.getState();
      await Promise.all([notifications.load(), saved.load()]);

      // A host may have moved or cancelled something that was saved. The
      // events are the ones the home screen loads, so this costs nothing more.
      if (useSavedStore.getState().saved.length > 0) {
        await useEventStore.getState().loadTonight();
        await saved.refresh();
      }
      await notifications.reschedule();
    };
    prepare().catch((e) => console.error('[App] Error setting up reminders:', e));

    // Coming back from the phone's settings, where notifications may have
    // been allowed or turned off
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const notifications = useNotificationStore.getState();
        notifications
          .checkPermission()
          .then(notifications.reschedule)
          .catch((e) => console.error('[App] Error setting up reminders:', e));
      }
    });

    const stopListening = onNotificationOpened((eventId) => {
      router.push((eventId ? `/event/${eventId}` : '/(tabs)/whats-on') as never);
    });

    return () => {
      appState.remove();
      stopListening();
    };
  }, []);

  if (!fontsReady || !welcomeLoaded) {
    return <LoadingSpinner fullScreen message="Loading Community..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="pick" options={{ presentation: 'modal' }} />
      <Stack.Screen name="account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
