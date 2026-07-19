import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Offer } from '../types';
import { timestampToDate } from '../services/firebase/firestore';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface OfferCardProps {
  offer: Offer;
  onClaim?: () => void;
  claimed?: boolean;
  compact?: boolean;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onClaim,
  claimed = false,
  compact = false,
}) => {
  const expiresAt = offer.validUntil ? timestampToDate(offer.validUntil as any) : null;

  const getTimeRemaining = (): string => {
    if (!expiresAt) return '';

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff < 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 7) return `Expires ${expiresAt.toLocaleDateString()}`;
    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expiring soon';
  };

  const getPartnerBadge = () => {
    switch (offer.partnerTier) {
      case 'premium':
        return { text: '⭐ PREMIUM', color: COLORS.accent || COLORS.primary };
      case 'enterprise':
        return { text: '💎 ENTERPRISE', color: COLORS.secondary };
      default:
        return null;
    }
  };

  const partnerBadge = getPartnerBadge();
  const timeRemaining = getTimeRemaining();
  const isAvailable = offer.currentRedemptions < offer.maxRedemptions;

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, !isAvailable && styles.unavailableCard]}
        onPress={onClaim}
        disabled={!isAvailable || claimed}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactBadge}>
            <Text style={styles.compactBadgeText}>{offer.badge}</Text>
          </View>
          <View style={styles.compactDetails}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {offer.title}
            </Text>
            <Text style={styles.compactExpiry}>{timeRemaining}</Text>
          </View>
        </View>
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>✓ Claimed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, !isAvailable && styles.unavailableCard]}>
      {/* Header with badge */}
      <View style={styles.header}>
        <View style={styles.offerBadge}>
          <Text style={styles.badgeText}>{offer.badge}</Text>
        </View>
        {partnerBadge && (
          <View style={[styles.partnerBadge, { backgroundColor: partnerBadge.color }]}>
            <Text style={styles.partnerBadgeText}>{partnerBadge.text}</Text>
          </View>
        )}
      </View>

      {/* Offer details */}
      <View style={styles.content}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {offer.description}
        </Text>

        {/* Availability info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⏰</Text>
            <Text style={styles.infoText}>{timeRemaining}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🎫</Text>
            <Text style={styles.infoText}>
              {offer.maxRedemptions - offer.currentRedemptions} left
            </Text>
          </View>
        </View>

        {/* Terms */}
        {offer.terms && (
          <Text style={styles.terms} numberOfLines={1}>
            {offer.terms}
          </Text>
        )}
      </View>

      {/* Action button */}
      {isAvailable && (
        <TouchableOpacity
          style={[styles.claimButton, claimed && styles.claimButtonClaimed]}
          onPress={onClaim}
          disabled={claimed}
          activeOpacity={0.8}
        >
          <Text style={[styles.claimButtonText, claimed && styles.claimButtonTextClaimed]}>
            {claimed ? '✓ Claimed' : 'Claim Offer'}
          </Text>
        </TouchableOpacity>
      )}

      {!isAvailable && (
        <View style={styles.unavailableButton}>
          <Text style={styles.unavailableButtonText}>No Longer Available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  unavailableCard: {
    opacity: 0.6,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  offerBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  badgeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  partnerBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  partnerBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  content: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: FONT_WEIGHTS.medium,
  },
  terms: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  claimButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  claimButtonClaimed: {
    backgroundColor: COLORS.success || '#4CAF50',
  },
  claimButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  claimButtonTextClaimed: {
    color: COLORS.textInverse,
  },
  unavailableButton: {
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  unavailableButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  // Compact styles
  compactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  compactBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  compactDetails: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  compactExpiry: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  claimedBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.success || '#4CAF50',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  claimedText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
});
