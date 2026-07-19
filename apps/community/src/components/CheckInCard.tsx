import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckIn } from '../types';
import { getCategoryInfo } from '../constants/categories';
import { timestampToDate } from '../services/firebase/firestore';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - SPACING.lg * 2 - SPACING.sm * 3) / 4;

interface CheckInCardProps {
  checkIn: CheckIn;
  onLike?: () => void;
  isLiked?: boolean;
  onDelete?: () => void;
  showDeleteButton?: boolean;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  checkIn,
  onLike,
  isLiked = false,
  onDelete,
  showDeleteButton = false,
}) => {
  const router = useRouter();
  const categoryInfo = getCategoryInfo(checkIn.venueCategory as any);

  const checkInDate = checkIn.createdAt
    ? timestampToDate(checkIn.createdAt as any)
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

  const handleVenuePress = () => {
    router.push(`/venue/${checkIn.venueId}`);
  };

  return (
    <View style={styles.card}>
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {checkIn.userPhotoURL ? (
            <Image
              source={{ uri: checkIn.userPhotoURL }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {checkIn.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{checkIn.userName}</Text>
            <TouchableOpacity onPress={handleVenuePress} style={styles.venueRow}>
              <Text style={styles.checkInText}>checked in at</Text>
              <Text style={styles.venueName}>{checkIn.venueName}</Text>
              <Text style={styles.categoryIcon}>{categoryInfo?.icon}</Text>
            </TouchableOpacity>
            <Text style={styles.date}>{formatDate(checkInDate)}</Text>
          </View>
        </View>
        {showDeleteButton && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caption */}
      {checkIn.caption && (
        <Text style={styles.caption}>{checkIn.caption}</Text>
      )}

      {/* Images */}
      {checkIn.images && checkIn.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {checkIn.images.map((imageUri, index) => (
            <Image
              key={index}
              source={{ uri: imageUri }}
              style={styles.checkInImage}
            />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={onLike}
        >
          <Text style={styles.likeIcon}>{isLiked ? '❤️' : '🤍'}</Text>
          <Text style={[styles.likeText, isLiked && styles.likeTextActive]}>
            {checkIn.likes > 0 ? checkIn.likes : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleVenuePress}
        >
          <Text style={styles.viewIcon}>📍</Text>
          <Text style={styles.viewText}>View Venue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
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
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  checkInText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  venueName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  categoryIcon: {
    fontSize: 14,
  },
  date: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  deleteIcon: {
    fontSize: 20,
  },
  caption: {
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
  checkInImage: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  likeIcon: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
  likeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  likeTextActive: {
    color: COLORS.primary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
  },
  viewIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  viewText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
});
