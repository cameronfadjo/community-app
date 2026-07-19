import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks';
import { Button } from '../../src/components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, isPremium } = useAuth();
  const [isVenueOwner] = useState(true); // TODO: Get from user profile

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile?.displayName?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{profile?.displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>⭐ Premium Member</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.bio}>{profile?.bio || 'No bio added yet'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Email Verified:</Text>
          <Text style={[styles.statusValue, user?.emailVerified && styles.statusSuccess]}>
            {user?.emailVerified ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Profile Status:</Text>
          <Text style={[styles.statusValue, styles.statusSuccess]}>
            ✅ Approved
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Subscription:</Text>
          <Text style={styles.statusValue}>
            {isPremium ? '⭐ Premium' : '🆓 Free'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>
      </View>

      {/* Partner Dashboard - Only show for venue owners */}
      {isVenueOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner Dashboard</Text>
          <Text style={styles.partnerSubtitle}>
            Manage your venue offers and view analytics
          </Text>

          <TouchableOpacity
            style={styles.partnerCard}
            onPress={() => router.push('/partner/analytics?venueId=sample_venue_1')}
          >
            <View style={styles.partnerIcon}>
              <Text style={styles.partnerIconText}>📊</Text>
            </View>
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>Analytics Dashboard</Text>
              <Text style={styles.partnerDescription}>
                View offer performance and insights
              </Text>
            </View>
            <Text style={styles.partnerArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.partnerCard}
            onPress={() =>
              router.push('/partner/create-offer?venueId=sample_venue_1&venueName=Sample Venue&partnerTier=premium')
            }
          >
            <View style={styles.partnerIcon}>
              <Text style={styles.partnerIconText}>🎁</Text>
            </View>
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>Create New Offer</Text>
              <Text style={styles.partnerDescription}>
                Add a new discount or special offer
              </Text>
            </View>
            <Text style={styles.partnerArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.partnerCard}
            onPress={() => {
              // TODO: Navigate to manage offers screen
            }}
          >
            <View style={styles.partnerIcon}>
              <Text style={styles.partnerIconText}>⚙️</Text>
            </View>
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>Manage Offers</Text>
              <Text style={styles.partnerDescription}>
                Edit or deactivate existing offers
              </Text>
            </View>
            <Text style={styles.partnerArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="Edit Profile"
          variant="outline"
          onPress={() => {
            // TODO: Navigate to edit profile
          }}
          fullWidth
          style={styles.button}
        />

        {!isPremium && (
          <Button
            title="Upgrade to Premium ⭐"
            onPress={() => {
              // TODO: Navigate to premium subscription
            }}
            fullWidth
            style={styles.button}
          />
        )}

        <Button
          title="Sign Out"
          variant="text"
          onPress={handleSignOut}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surfaceVariant,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.md,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  name: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  premiumBadge: {
    backgroundColor: COLORS.premium,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginTop: SPACING.md,
  },
  premiumText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textInverse,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  statusSuccess: {
    color: COLORS.success,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 12,
    marginHorizontal: SPACING.xs,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  actions: {
    padding: SPACING.lg,
  },
  button: {
    marginBottom: SPACING.md,
  },
  partnerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  partnerIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  partnerIconText: {
    fontSize: 24,
  },
  partnerContent: {
    flex: 1,
  },
  partnerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  partnerDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  partnerArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
});
