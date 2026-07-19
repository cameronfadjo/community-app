import React from 'react';
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
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🗺️</span>,
          headerTitle: 'Explore Community',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>❤️</span>,
          headerTitle: 'My Favorites',
        }}
      />
      <Tabs.Screen
        name="my-offers"
        options={{
          title: 'Offers',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🎁</span>,
          headerTitle: 'My Offers',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>🌈</span>,
          headerTitle: 'Community Feed',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <span style={{ fontSize: 24 }}>👤</span>,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
