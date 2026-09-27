import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS } from '../../constants/theme';

/** Opens the account screen. Shows an initial once someone is signed in. */
export const AccountButton: React.FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();

  const initial = (profile?.displayName ?? user?.email ?? '').trim().charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.button, user && styles.buttonSignedIn]}
      onPress={() => router.push('/account')}
      accessibilityRole="button"
      accessibilityLabel={user ? 'Your account' : 'Sign in or create an account'}
    >
      {user && initial ? (
        <Text style={styles.initial}>{initial}</Text>
      ) : (
        <MaterialCommunityIcons name="account-outline" size={22} color={COLORS.text} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSignedIn: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  initial: {
    fontFamily: FONTS.black,
    fontSize: 17,
    color: COLORS.primaryDark,
  },
});
