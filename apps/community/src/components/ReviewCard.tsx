import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Review } from '../types';
import { StarRating } from './StarRating';
import { timestampToDate } from '../services/firebase/firestore';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface ReviewCardProps {
  review: Review;
  onHelpful?: () => void;
  onImagePress?: (imageUri: string, index: number) => void;
  isHelpful?: boolean;
  hideUserInfo?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onHelpful,
  onImagePress,
  isHelpful = false,
  hideUserInfo = false,
}) => {
  const reviewDate = review.createdAt
    ? timestampToDate(review.createdAt as any)
    : new Date();

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.card}>
      {/* User Info Header */}
      <View style={styles.header}>
        {!hideUserInfo && (
          <View style={styles.userInfo}>
            {review.userPhotoURL ? (
              <Image
                source={{ uri: review.userPhotoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {review.userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{review.userName}</Text>
              <Text style={styles.date}>{formatDate(reviewDate)}</Text>
            </View>
          </View>
        )}
        {hideUserInfo && (
          <Text style={styles.date}>{formatDate(reviewDate)}</Text>
        )}
        <StarRating rating={review.rating} readonly size={20} />
      </View>

      {/* Review Text */}
      <Text style={styles.reviewText}>{review.text}</Text>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {review.images.map((imageUri, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => onImagePress?.(imageUri, index)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.reviewImage}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Helpful Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.helpfulButton, isHelpful && styles.helpfulButtonActive]}
          onPress={onHelpful}
        >
          <Text style={[styles.helpfulIcon, isHelpful && styles.helpfulIconActive]}>
            {isHelpful ? '👍' : '👍🏻'}
          </Text>
          <Text style={[styles.helpfulText, isHelpful && styles.helpfulTextActive]}>
            Helpful {review.helpful > 0 ? `(${review.helpful})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  date: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  reviewText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  imagesContainer: {
    marginBottom: SPACING.sm,
  },
  imagesContent: {
    gap: SPACING.sm,
  },
  reviewImage: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  helpfulButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  helpfulIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  helpfulIconActive: {
    fontSize: 16,
  },
  helpfulText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },
  helpfulTextActive: {
    color: COLORS.primary,
  },
});
