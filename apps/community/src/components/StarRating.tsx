import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  maxStars?: number;
  size?: number;
  readonly?: boolean;
  showNumber?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  maxStars = 5,
  size = 32,
  readonly = false,
  showNumber = false,
}) => {
  const handlePress = (index: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const getStarIcon = (index: number): string => {
    const starValue = index + 1;
    if (rating >= starValue) {
      return '⭐'; // Filled star
    } else if (rating >= starValue - 0.5) {
      return '⭐'; // Half star (using filled for simplicity)
    } else {
      return '☆'; // Empty star
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[...Array(maxStars)].map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(index)}
            disabled={readonly}
            activeOpacity={readonly ? 1 : 0.7}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={[styles.star, { fontSize: size }]}>
              {getStarIcon(index)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {showNumber && (
        <Text style={styles.ratingNumber}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    lineHeight: undefined, // Let system handle line height
  },
  ratingNumber: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
});
