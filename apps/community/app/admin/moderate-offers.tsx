import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Offer } from '../../src/types';
import { LoadingSpinner } from '../../src/components';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

export default function ModerateOffersScreen() {
  const [loading, setLoading] = useState(true);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    loadPendingOffers();
  }, []);

  const loadPendingOffers = async () => {
    setLoading(true);
    try {
      // TODO: Fetch pending offers from Firebase
      // const offers = await queryDocuments<Offer>(COLLECTIONS.OFFERS, [
      //   where('moderationStatus', '==', 'pending'),
      //   orderBy('createdAt', 'desc'),
      // ]);
      // setPendingOffers(offers);

      // Sample data for now
      setPendingOffers([]);
    } catch (error) {
      console.error('Error loading pending offers:', error);
      Alert.alert('Error', 'Failed to load pending offers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (offerId: string) => {
    setModerating(offerId);

    try {
      // TODO: Update offer status to approved
      // await updateDocument(COLLECTIONS.OFFERS, offerId, {
      //   moderationStatus: 'approved',
      //   approvedAt: new Date(),
      //   approvedBy: 'admin_user_id',
      // });

      Alert.alert('Success', 'Offer approved successfully');

      // Remove from pending list
      setPendingOffers(prev => prev.filter(o => o.id !== offerId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve offer');
    } finally {
      setModerating(null);
    }
  };

  const handleReject = async (offerId: string) => {
    Alert.alert(
      'Reject Offer',
      'Are you sure you want to reject this offer? The venue owner will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setModerating(offerId);

            try {
              // TODO: Update offer status to rejected
              // await updateDocument(COLLECTIONS.OFFERS, offerId, {
              //   moderationStatus: 'rejected',
              //   rejectedAt: new Date(),
              //   rejectedBy: 'admin_user_id',
              // });

              Alert.alert('Success', 'Offer rejected');

              // Remove from pending list
              setPendingOffers(prev => prev.filter(o => o.id !== offerId));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject offer');
            } finally {
              setModerating(null);
            }
          },
        },
      ]
    );
  };

  const renderOfferCard = ({ item }: { item: Offer }) => {
    const expiresAt = item.validUntil.toDate();
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <View style={styles.offerCard}>
        {/* Header */}
        <View style={styles.offerHeader}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>{item.badge}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{item.partnerTier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Venue Info */}
        <Text style={styles.venueName}>{item.venueName}</Text>
        <Text style={styles.venueCategory}>{item.venueCategory}</Text>

        {/* Offer Info */}
        <Text style={styles.offerTitle}>{item.title}</Text>
        <Text style={styles.offerDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Type:</Text>
            <Text style={styles.metadataValue}>{item.type}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Value:</Text>
            <Text style={styles.metadataValue}>{item.value}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Max Redemptions:</Text>
            <Text style={styles.metadataValue}>{item.maxRedemptions}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Expires In:</Text>
            <Text style={styles.metadataValue}>{daysRemaining} days</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsLabel}>Terms:</Text>
          <Text style={styles.termsText} numberOfLines={3}>
            {item.terms}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={moderating === item.id}
          >
            <Text style={styles.rejectButtonText}>
              {moderating === item.id ? 'Processing...' : 'Reject'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={moderating === item.id}
          >
            <Text style={styles.approveButtonText}>
              {moderating === item.id ? 'Processing...' : 'Approve'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Moderate Offers' }} />
        <LoadingSpinner message="Loading pending offers..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Moderate Offers',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Pending Offers</Text>
        <Text style={styles.subtitle}>{pendingOffers.length} awaiting review</Text>
      </View>

      {pendingOffers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>
            There are no pending offers to review at this time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingOffers}
          renderItem={renderOfferCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SPACING.lg,
  },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badgeContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  badge: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  tierBadge: {
    backgroundColor: COLORS.secondary || '#9C27B0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  tierText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  venueName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  venueCategory: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  offerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  offerDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  metadata: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  metadataLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  metadataValue: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  termsContainer: {
    marginBottom: SPACING.md,
  },
  termsLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  termsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: COLORS.success || '#4CAF50',
  },
  approveButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  rejectButton: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
