import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StarRating, Button, LoadingSpinner } from '../../src/components';
import { createReview, getReview, updateReview } from '../../src/services/api/reviews';
import { uploadReviewImage } from '../../src/services/firebase/storage';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../src/constants/theme';

export default function WriteReviewScreen() {
  const router = useRouter();
  const { venueId, venueName, reviewId } = useLocalSearchParams<{
    venueId: string;
    venueName: string;
    reviewId?: string;
  }>();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!reviewId;

  useEffect(() => {
    if (isEditing && reviewId) {
      loadExistingReview();
    }
  }, [reviewId]);

  const loadExistingReview = async () => {
    if (!reviewId) return;

    setLoading(true);
    try {
      const review = await getReview(reviewId);
      if (review) {
        setRating(review.rating);
        setReviewText(review.text);
        setSelectedImages(review.images || []);
      }
    } catch (error) {
      console.error('Error loading review:', error);
      Alert.alert('Error', 'Failed to load review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos per review.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to add images to your review.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - selectedImages.length,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => asset.uri);
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const validateReview = (): boolean => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating for your review.');
      return false;
    }

    if (reviewText.trim().length < 10) {
      Alert.alert(
        'Review Too Short',
        'Please write at least 10 characters to share your experience.'
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateReview() || !venueId) {
      return;
    }

    setUploading(true);

    try {
      // Upload new images (those that don't start with https://)
      const imageUrls: string[] = [];
      const tempReviewId = reviewId || `temp_${Date.now()}`;

      for (let i = 0; i < selectedImages.length; i++) {
        const imageUri = selectedImages[i];

        // If it's already uploaded (starts with https://), keep it
        if (imageUri.startsWith('https://')) {
          imageUrls.push(imageUri);
        } else {
          // Upload new image
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const url = await uploadReviewImage(tempReviewId, blob, i);
          imageUrls.push(url);
        }
      }

      if (isEditing && reviewId) {
        // Update existing review
        await updateReview(reviewId, {
          rating,
          text: reviewText.trim(),
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });

        Alert.alert(
          'Review Updated!',
          'Your review has been successfully updated.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Create new review
        await createReview(venueId, {
          rating,
          text: reviewText.trim(),
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });

        Alert.alert(
          'Review Submitted!',
          'Thank you for sharing your experience with the community.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading review..." />;
  }

  if (uploading) {
    return <LoadingSpinner fullScreen message={isEditing ? 'Updating your review...' : 'Submitting your review...'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Edit Review' : 'Write a Review'}</Text>
          <Text style={styles.venueName}>{venueName || 'Venue'}</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating *</Text>
          <View style={styles.ratingContainer}>
            <StarRating rating={rating} onRatingChange={setRating} size={48} />
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 1 && '😞 Poor'}
              {rating === 2 && '😐 Fair'}
              {rating === 3 && '🙂 Good'}
              {rating === 4 && '😊 Very Good'}
              {rating === 5 && '🤩 Excellent'}
            </Text>
          )}
        </View>

        {/* Review Text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Experience *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Share details about your visit... What did you love? What could be better?"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={8}
            value={reviewText}
            onChangeText={setReviewText}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {reviewText.length}/500 characters
          </Text>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Help others by showing what this place is like
          </Text>

          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesPreview}
              contentContainerStyle={styles.imagesPreviewContent}
            >
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {selectedImages.length < 5 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>
                Add Photos ({selectedImages.length}/5)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>📝 Review Guidelines</Text>
          <Text style={styles.guidelineText}>• Be honest and respectful</Text>
          <Text style={styles.guidelineText}>• Share specific details</Text>
          <Text style={styles.guidelineText}>• Focus on your experience</Text>
          <Text style={styles.guidelineText}>• No hate speech or discrimination</Text>
        </View>

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Update Review' : 'Submit Review'}
          onPress={handleSubmit}
          disabled={rating === 0 || reviewText.trim().length < 10}
          fullWidth
          style={styles.submitButton}
        />

        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  venueName: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.md,
  },
  ratingLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 150,
  },
  charCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  imagesPreview: {
    marginBottom: SPACING.md,
  },
  imagesPreviewContent: {
    gap: SPACING.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: COLORS.textInverse,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  addPhotoText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  guidelines: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  guidelinesTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  guidelineText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  submitButton: {
    marginBottom: SPACING.md,
  },
});
