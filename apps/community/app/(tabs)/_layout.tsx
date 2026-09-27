import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../src/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const tabIcon =
  (name: IconName) =>
  ({ color }: { color: string }) => <MaterialCommunityIcons name={name} size={26} color={color} />;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primaryDark,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.bold,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="tonight"
        options={{ title: 'Tonight', tabBarIcon: tabIcon('moon-waning-crescent') }}
      />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: tabIcon('map-outline') }} />
      <Tabs.Screen
        name="perks"
        options={{ title: 'Perks', tabBarIcon: tabIcon('ticket-confirmation-outline') }}
      />

      {/* Earlier screens, kept out of the tab bar until they are removed */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="my-offers" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
