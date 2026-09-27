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
import { COLORS } from '../src/constants/theme';

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
      router.replace('/(tabs)/tonight');
    }
  }, [isAuthenticated, initialized, segments]);

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
    </Stack>
  );
}
