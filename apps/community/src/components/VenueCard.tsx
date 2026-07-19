import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Venue } from '../types';
import { getCategoryInfo } from '../constants/categories';
import { getPriceSymbol } from '../constants/priceRanges';
import { formatDistance } from '../services/firebase/geolocation';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;
const IMAGE_HEIGHT = 220;

interface VenueCardProps {
  venue: Venue & { distance?: number };
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  offerCount?: number; // Number of active offers at this venue
}

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  onPress,
  onFavorite,
  isFavorite = false,
  offerCount = 0,
}) => {
  const categoryInfo = getCategoryInfo(venue.category);
  const priceSymbol = getPriceSymbol(venue.priceRange);

  // Use first image or placeholder
  const imageUri = venue.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Large Hero Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Gradient Overlay for readability */}
        <View style={styles.gradientOverlay} />

        {/* Top Row: Category Badge, Offer Indicator & Favorite Button */}
        <View style={styles.topRow}>
          <View style={styles.leftBadges}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{categoryInfo?.icon}</Text>
              <Text style={styles.categoryText}>{categoryInfo?.label}</Text>
            </View>

            {/* Offer Indicator */}
            {offerCount > 0 && (
              <View style={styles.offerIndicator}>
                <Text style={styles.offerIcon}>🎁</Text>
                <Text style={styles.offerCount}>{offerCount}</Text>
              </View>
            )}
          </View>

          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onFavorite}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Info Overlay */}
        <View style={styles.infoOverlay}>
          <View style={styles.venueHeader}>
            <View style={styles.venueInfo}>
              <Text style={styles.venueName} numberOfLines={1}>
                {venue.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.location}>
                  📍 {venue.location.city}
                </Text>
                {venue.distance !== undefined && (
                  <>
                    <Text style={styles.separator}>•</Text>
                    <Text style={styles.distance}>
                      {formatDistance(venue.distance)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Rating & Price Row */}
          <View style={styles.bottomRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.rating}>
                {venue.rating > 0 ? venue.rating.toFixed(1) : 'New'}
              </Text>
              {venue.reviewCount > 0 && (
                <Text style={styles.reviewCount}>
                  ({venue.reviewCount} {venue.reviewCount === 1 ? 'review' : 'reviews'})
                </Text>
              )}
              {venue.reviewCount === 0 && (
                <Text style={styles.noReviews}>No reviews yet</Text>
              )}
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.price}>{priceSymbol}</Text>
            </View>
          </View>

          {/* High Rating Badge */}
          {venue.rating >= 4.5 && venue.reviewCount >= 10 && (
            <View style={styles.highRatingBadge}>
              <Text style={styles.highRatingText}>🏆 Highly Rated</Text>
            </View>
          )}
        </View>

        {/* Featured Badge */}
        {venue.featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>⭐ FEATURED</Text>
          </View>
        )}
      </View>

      {/* Quick Description (if you want to add text) */}
      {venue.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description} numberOfLines={2}>
            {venue.description}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'flex-start',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  offerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
    gap: 4,
  },
  offerIcon: {
    fontSize: 14,
  },
  offerCount: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  venueHeader: {
    marginBottom: SPACING.xs,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  separator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    marginHorizontal: SPACING.xs,
  },
  distance: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  rating: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textInverse,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  reviewCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textInverse,
    marginLeft: SPACING.xs,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  noReviews: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textInverse,
    marginLeft: SPACING.xs,
    opacity: 0.8,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  highRatingBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    ...SHADOWS.sm,
  },
  highRatingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  priceContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  price: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.featured,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    ...SHADOWS.md,
  },
  featuredText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  descriptionContainer: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
