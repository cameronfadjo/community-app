import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.textInverse,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🗺️</Text>,
          headerTitle: 'Explore Community',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>❤️</Text>,
          headerTitle: 'My Favorites',
        }}
      />
      <Tabs.Screen
        name="my-offers"
        options={{
          title: 'Offers',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🎁</Text>,
          headerTitle: 'My Offers',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🌈</Text>,
          headerTitle: 'Community Feed',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
