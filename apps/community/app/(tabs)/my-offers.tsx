import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { ClaimedOffer } from '../../src/types';
import { LoadingSpinner, RedemptionModal } from '../../src/components';
import { getUserClaimedOffers } from '../../src/services/api/offers';
import { useAuth } from '../../src/hooks/useAuth';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

type OfferTab = 'active' | 'expired';

export default function MyOffersScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<OfferTab>('active');
  const [claimedOffers, setClaimedOffers] = useState<ClaimedOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<ClaimedOffer | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadClaimedOffers();
    }
  }, [user]);

  const loadClaimedOffers = async () => {
    if (!user) return;

    try {
      const offers = await getUserClaimedOffers();
      setClaimedOffers(offers);
    } catch (error) {
      console.error('Error loading claimed offers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClaimedOffers();
  };

  const handleOfferPress = (offer: ClaimedOffer) => {
    // Update time remaining
    const now = Date.now();
    const expiresAtMs = offer.redemption.expiresAt.toMillis();
    const timeRemaining = Math.max(0, expiresAtMs - now);

    setSelectedOffer({
      ...offer,
      timeRemaining,
    });
    setShowRedemptionModal(true);
  };

  const getActiveOffers = () => {
    const now = Date.now();
    return claimedOffers.filter(offer => {
      const expiresAtMs = offer.redemption.expiresAt.toMillis();
      return (
        expiresAtMs > now &&
        offer.redemption.status === 'pending'
      );
    });
  };

  const getExpiredOffers = () => {
    const now = Date.now();
    return claimedOffers.filter(offer => {
      const expiresAtMs = offer.redemption.expiresAt.toMillis();
      return (
        expiresAtMs <= now ||
        offer.redemption.status === 'expired' ||
        offer.redemption.status === 'used' ||
        offer.redemption.status === 'validated'
      );
    });
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'Expiring soon!';
    if (minutes < 60) return `${minutes}m remaining`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h remaining`;
  };

  const getStatusBadge = (offer: ClaimedOffer) => {
    const now = Date.now();
    const expiresAtMs = offer.redemption.expiresAt.toMillis();
    const timeRemaining = Math.max(0, expiresAtMs - now);

    if (offer.redemption.status === 'validated' || offer.redemption.status === 'used') {
      return { text: 'Redeemed', color: COLORS.success || '#4CAF50' };
    }

    if (timeRemaining === 0 || offer.redemption.status === 'expired') {
      return { text: 'Expired', color: COLORS.textSecondary };
    }

    if (timeRemaining < 5 * 60 * 1000) {
      return { text: formatTimeRemaining(timeRemaining), color: '#FF9800' };
    }

    return { text: formatTimeRemaining(timeRemaining), color: COLORS.primary };
  };

  const renderOfferCard = ({ item }: { item: ClaimedOffer }) => {
    const status = getStatusBadge(item);
    const isActive = activeTab === 'active';

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => handleOfferPress(item)}
        disabled={!isActive}
      >
        {/* Badge */}
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>{item.badge}</Text>
        </View>

        {/* Content */}
        <View style={styles.offerContent}>
          <Text style={styles.offerTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.offerVenue} numberOfLines={1}>
            {item.venueName}
          </Text>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>

          {/* Redemption code (only for active) */}
          {isActive && (
            <View style={styles.codePreview}>
              <Text style={styles.codeLabel}>Code:</Text>
              <Text style={styles.codeText}>{item.redemption.code}</Text>
            </View>
          )}

          {/* Redeemed timestamp (only for expired/used) */}
          {!isActive && item.redemption.validatedAt && (
            <Text style={styles.redeemedAt}>
              Redeemed {item.redemption.validatedAt.toDate().toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Arrow icon */}
        {isActive && (
          <View style={styles.arrowIcon}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isActive = activeTab === 'active';

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{isActive ? '🎁' : '📜'}</Text>
        <Text style={styles.emptyTitle}>
          {isActive ? 'No Active Offers' : 'No Past Offers'}
        </Text>
        <Text style={styles.emptyText}>
          {isActive
            ? 'Claim offers from your favorite venues to see them here'
            : 'Offers you\'ve redeemed or that have expired will appear here'}
        </Text>
      </View>
    );
  };

  const renderTabBar = () => {
    const activeCount = getActiveOffers().length;
    const expiredCount = getExpiredOffers().length;

    return (
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
          onPress={() => setActiveTab('expired')}
        >
          <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
            Past ({expiredCount})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.emptyState}>
        <Stack.Screen options={{ title: 'My Offers' }} />
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.emptyTitle}>Sign In Required</Text>
        <Text style={styles.emptyText}>
          Please sign in to view your claimed offers
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'My Offers' }} />
        <LoadingSpinner message="Loading your offers..." />
      </View>
    );
  }

  const displayOffers = activeTab === 'active' ? getActiveOffers() : getExpiredOffers();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Offers',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Offers List */}
      <FlatList
        data={displayOffers}
        renderItem={renderOfferCard}
        keyExtractor={item => item.redemption.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {/* Redemption Modal */}
      <RedemptionModal
        visible={showRedemptionModal}
        claimedOffer={selectedOffer}
        onClose={() => setShowRedemptionModal(false)}
      />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  listContent: {
    padding: SPACING.md,
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    alignItems: 'center',
  },
  offerBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  offerBadgeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  offerContent: {
    flex: 1,
  },
  offerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  offerVenue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  codePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  codeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  codeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    letterSpacing: 2,
  },
  redeemedAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  arrowIcon: {
    marginLeft: SPACING.sm,
  },
  arrowText: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xxxl,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
