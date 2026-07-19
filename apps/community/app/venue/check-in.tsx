import React, { useState } from 'react';
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
import { Button, LoadingSpinner } from '../../src/components';
import { createCheckIn } from '../../src/services/api/checkins';
import { uploadCheckInImage } from '../../src/services/firebase/storage';
import { CheckInVisibility } from '../../src/types';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../src/constants/theme';

export default function CheckInScreen() {
  const router = useRouter();
  const { venueId, venueName } = useLocalSearchParams<{
    venueId: string;
    venueName: string;
  }>();

  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<CheckInVisibility>('public');
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    if (selectedImages.length >= 4) {
      Alert.alert('Limit Reached', 'You can upload up to 4 photos per check-in.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to add images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4 - selectedImages.length,
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

  const handleSubmit = async () => {
    if (!venueId) {
      Alert.alert('Error', 'Venue information is missing.');
      return;
    }

    setUploading(true);

    try {
      // Upload images if any
      const imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const checkInId = `temp_${Date.now()}`;

        for (let i = 0; i < selectedImages.length; i++) {
          const response = await fetch(selectedImages[i]);
          const blob = await response.blob();
          const url = await uploadCheckInImage(checkInId, blob, i);
          imageUrls.push(url);
        }
      }

      // Create check-in
      await createCheckIn(venueId, {
        caption: caption.trim() || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        visibility,
      });

      Alert.alert(
        'Checked In! 📍',
        'Your check-in has been shared with the community.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating check-in:', error);
      Alert.alert('Error', error.message || 'Failed to create check-in. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return <LoadingSpinner fullScreen message="Posting your check-in..." />;
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
          <Text style={styles.title}>Check In</Text>
          <Text style={styles.venueName}>📍 {venueName || 'Unknown Venue'}</Text>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's happening?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Share your experience... (optional)"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            value={caption}
            onChangeText={setCaption}
            maxLength={280}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {caption.length}/280 characters
          </Text>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>

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

          {selectedImages.length < 4 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>
                Add Photos ({selectedImages.length}/4)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who can see this?</Text>
          <View style={styles.visibilityOptions}>
            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'public' && styles.visibilityButtonActive,
              ]}
              onPress={() => setVisibility('public')}
            >
              <Text style={styles.visibilityIcon}>🌍</Text>
              <View>
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'public' && styles.visibilityTextActive,
                  ]}
                >
                  Public
                </Text>
                <Text style={styles.visibilitySubtext}>Everyone can see</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'friends' && styles.visibilityButtonActive,
              ]}
              onPress={() => setVisibility('friends')}
            >
              <Text style={styles.visibilityIcon}>👥</Text>
              <View>
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'friends' && styles.visibilityTextActive,
                  ]}
                >
                  Friends
                </Text>
                <Text style={styles.visibilitySubtext}>Friends only</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.visibilityButton,
                visibility === 'private' && styles.visibilityButtonActive,
              ]}
              onPress={() => setVisibility('private')}
            >
              <Text style={styles.visibilityIcon}>🔒</Text>
              <View>
                <Text
                  style={[
                    styles.visibilityText,
                    visibility === 'private' && styles.visibilityTextActive,
                  ]}
                >
                  Private
                </Text>
                <Text style={styles.visibilitySubtext}>Only you</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Check-in Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Let the community know you're here! Your check-in helps others discover great places.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title="Post Check-In"
          onPress={handleSubmit}
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
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 100,
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
    width: 120,
    height: 120,
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
  visibilityOptions: {
    gap: SPACING.sm,
  },
  visibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  visibilityButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  visibilityIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  visibilityText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  visibilityTextActive: {
    color: COLORS.primary,
  },
  visibilitySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  submitButton: {
    marginBottom: SPACING.md,
  },
});
