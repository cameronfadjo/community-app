import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Venue, Review, Offer, ClaimedOffer } from '../../src/types';
import { ImageGallery, Button, LoadingSpinner, ReviewCard, OfferCard, RedemptionModal } from '../../src/components';
import { getVenue } from '../../src/services/api/venues';
import { getVenueReviews, markReviewHelpful } from '../../src/services/api/reviews';
import { getVenueOffers, claimOffer, trackAnalyticsEvent } from '../../src/services/api/offers';
import { getCategoryInfo } from '../../src/constants/categories';
import { getPriceRangeInfo } from '../../src/constants/priceRanges';
import { openDirections, openPhoneDialer, openWebsite } from '../../src/utils/location';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../src/constants/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { useFavoritesStore } from '../../src/store/favoritesStore';

type ReviewSortOption = 'recent' | 'helpful' | 'rating';

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite: checkIsFavorite } = useFavoritesStore();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [reviewSort, setReviewSort] = useState<ReviewSortOption>('recent');
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [claimedOffers, setClaimedOffers] = useState<Set<string>>(new Set());
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedClaimedOffer, setSelectedClaimedOffer] = useState<ClaimedOffer | null>(null);

  const isFavorite = id ? checkIsFavorite(id) : false;

  useEffect(() => {
    loadVenue();
    loadReviews();
    loadOffers();
  }, [id]);

  const loadVenue = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const venueData = await getVenue(id);
      setVenue(venueData);
    } catch (error) {
      console.error('Error loading venue:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    if (!id) return;

    setLoadingReviews(true);
    try {
      const reviewsData = await getVenueReviews(id);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadOffers = async () => {
    if (!id) return;

    setLoadingOffers(true);
    try {
      const offersData = await getVenueOffers(id);
      setOffers(offersData);

      // Track offer views
      for (const offer of offersData) {
        await trackAnalyticsEvent('offer_view', offer.id, id);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleClaimOffer = async (offer: Offer) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to claim offers.');
      return;
    }

    try {
      // Track click event
      await trackAnalyticsEvent('offer_click', offer.id, offer.venueId);

      // Claim the offer
      const redemption = await claimOffer(offer.id);

      // Add to claimed set
      setClaimedOffers(prev => new Set(prev).add(offer.id));

      // Show redemption modal
      const claimedOffer: ClaimedOffer = {
        ...offer,
        redemption,
        timeRemaining: 15 * 60 * 1000, // 15 minutes
      };
      setSelectedClaimedOffer(claimedOffer);
      setShowRedemptionModal(true);
    } catch (error: any) {
      console.error('Error claiming offer:', error);
      Alert.alert('Error', error.message || 'Failed to claim offer. Please try again.');
    }
  };

  const handleHelpfulToggle = async (reviewId: string) => {
    if (!user) return;

    const isCurrentlyHelpful = helpfulReviews.has(reviewId);

    // Optimistic update
    const newHelpfulReviews = new Set(helpfulReviews);
    if (isCurrentlyHelpful) {
      newHelpfulReviews.delete(reviewId);
    } else {
      newHelpfulReviews.add(reviewId);
    }
    setHelpfulReviews(newHelpfulReviews);

    // Update review helpful count locally
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review.id === reviewId
          ? { ...review, helpful: review.helpful + (isCurrentlyHelpful ? -1 : 1) }
          : review
      )
    );

    try {
      await markReviewHelpful(reviewId, user.uid, !isCurrentlyHelpful);
    } catch (error) {
      console.error('Error marking review helpful:', error);
      // Revert on error
      setHelpfulReviews(helpfulReviews);
    }
  };

  const getSortedReviews = () => {
    const sorted = [...reviews];
    switch (reviewSort) {
      case 'recent':
        return sorted.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      case 'helpful':
        return sorted.sort((a, b) => b.helpful - a.helpful);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  };

  const handleFavorite = async () => {
    if (!id || !venue) return;

    try {
      await toggleFavorite(id, venue);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShare = async () => {
    if (!venue) return;

    try {
      await Share.share({
        message: `Check out ${venue.name} on Community! ${venue.description}`,
        title: venue.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGetDirections = () => {
    if (!venue) return;
    openDirections(
      venue.location.coordinates.latitude,
      venue.location.coordinates.longitude,
      venue.name
    );
  };

  const handleCall = () => {
    if (!venue?.contact.phone) return;
    openPhoneDialer(venue.contact.phone);
  };

  const handleVisitWebsite = () => {
    if (!venue?.contact.website) return;
    openWebsite(venue.contact.website);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading venue..." />;
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Venue not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const categoryInfo = getCategoryInfo(venue.category);
  const priceRangeInfo = getPriceRangeInfo(venue.priceRange);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <ImageGallery images={venue.images} height={350} />

        {/* Main Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryIcon}>{categoryInfo?.icon}</Text>
                <Text style={styles.categoryText}>{categoryInfo?.label}</Text>
              </View>
              {venue.featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>⭐ FEATURED</Text>
                </View>
              )}
            </View>

            <Text style={styles.venueName}>{venue.name}</Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingContainer}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.rating}>
                  {venue.rating > 0 ? venue.rating.toFixed(1) : 'New'}
                </Text>
                {venue.reviewCount > 0 && (
                  <Text style={styles.reviewCount}>({venue.reviewCount} reviews)</Text>
                )}
              </View>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.priceRange}>{priceRangeInfo?.symbol}</Text>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.location}>
                {venue.location.city}, {venue.location.country}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetDirections}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>🗺️</Text>
              </View>
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>

            {venue.contact.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>📞</Text>
                </View>
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
            )}

            {venue.contact.website && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleVisitWebsite}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionIconText}>🌐</Text>
                </View>
                <Text style={styles.actionText}>Website</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📤</Text>
              </View>
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{venue.description}</Text>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity onPress={handleGetDirections}>
              <Text style={styles.address}>
                📍 {venue.location.address}
                {'\n'}
                {venue.location.city}
                {venue.location.state && `, ${venue.location.state}`}
                {'\n'}
                {venue.location.country}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contact Info */}
          {(venue.contact.phone || venue.contact.email || venue.contact.website) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              {venue.contact.phone && (
                <TouchableOpacity onPress={handleCall} style={styles.contactItem}>
                  <Text style={styles.contactLabel}>📞 Phone:</Text>
                  <Text style={styles.contactValue}>{venue.contact.phone}</Text>
                </TouchableOpacity>
              )}
              {venue.contact.email && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${venue.contact.email}`)}
                  style={styles.contactItem}
                >
                  <Text style={styles.contactLabel}>📧 Email:</Text>
                  <Text style={styles.contactValue}>{venue.contact.email}</Text>
                </TouchableOpacity>
              )}
              {venue.contact.website && (
                <TouchableOpacity
                  onPress={handleVisitWebsite}
                  style={styles.contactItem}
                >
                  <Text style={styles.contactLabel}>🌐 Website:</Text>
                  <Text style={styles.contactValue}>{venue.contact.website}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Offers Section */}
          {offers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.offersHeader}>
                <Text style={styles.sectionTitle}>
                  🎁 Special Offers ({offers.length})
                </Text>
              </View>
              {loadingOffers ? (
                <LoadingSpinner message="Loading offers..." />
              ) : (
                <View style={styles.offersList}>
                  {offers.map(offer => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onClaim={() => handleClaimOffer(offer)}
                      claimed={claimedOffers.has(offer.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>
                Reviews {venue.reviewCount > 0 && `(${venue.reviewCount})`}
              </Text>
              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => router.push(`/venue/write-review?venueId=${id}`)}
              >
                <Text style={styles.writeReviewText}>✍️ Write Review</Text>
              </TouchableOpacity>
            </View>

            {/* Review Statistics */}
            {venue.reviewCount > 0 && (
              <View style={styles.reviewStats}>
                <View style={styles.ratingDisplay}>
                  <Text style={styles.ratingNumber}>{venue.rating.toFixed(1)}</Text>
                  <Text style={styles.ratingStars}>{'⭐'.repeat(Math.round(venue.rating))}</Text>
                  <Text style={styles.ratingText}>
                    Based on {venue.reviewCount} review{venue.reviewCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Sort Options */}
            {reviews.length > 0 && (
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <View style={styles.sortButtons}>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      reviewSort === 'recent' && styles.sortButtonActive,
                    ]}
                    onPress={() => setReviewSort('recent')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        reviewSort === 'recent' && styles.sortButtonTextActive,
                      ]}
                    >
                      Most Recent
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      reviewSort === 'helpful' && styles.sortButtonActive,
                    ]}
                    onPress={() => setReviewSort('helpful')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        reviewSort === 'helpful' && styles.sortButtonTextActive,
                      ]}
                    >
                      Most Helpful
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      reviewSort === 'rating' && styles.sortButtonActive,
                    ]}
                    onPress={() => setReviewSort('rating')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        reviewSort === 'rating' && styles.sortButtonTextActive,
                      ]}
                    >
                      Top Rated
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Reviews List */}
            {loadingReviews ? (
              <LoadingSpinner message="Loading reviews..." />
            ) : reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {getSortedReviews().map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onHelpful={() => handleHelpfulToggle(review.id)}
                    isHelpful={helpfulReviews.has(review.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.noReviews}>
                <Text style={styles.noReviewsIcon}>📝</Text>
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>
                  Be the first to share your experience!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavorite}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        <Button
          title="Check In Here"
          onPress={() => router.push(`/venue/check-in?venueId=${id}&venueName=${venue?.name || ''}`)}
          style={styles.checkInButton}
        />
      </View>

      {/* Redemption Modal */}
      <RedemptionModal
        visible={showRedemptionModal}
        claimedOffer={selectedClaimedOffer}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  featuredBadge: {
    backgroundColor: COLORS.featured,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  featuredText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  venueName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  separator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.sm,
  },
  priceRange: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  location: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  actionIconText: {
    fontSize: 28,
  },
  actionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 24,
  },
  address: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  contactLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    width: 100,
  },
  contactValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    flex: 1,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  writeReviewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  writeReviewText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.surface,
  },
  reviewStats: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  ratingStars: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sortContainer: {
    marginBottom: SPACING.lg,
  },
  sortLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sortButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  reviewsList: {
    gap: SPACING.md,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  noReviewsIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  noReviewsText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  noReviewsSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  offersHeader: {
    marginBottom: SPACING.md,
  },
  offersList: {
    gap: SPACING.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  favoriteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  favoriteIcon: {
    fontSize: 28,
  },
  checkInButton: {
    flex: 1,
  },
});
