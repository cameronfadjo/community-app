import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Button, Input } from '../../src/components';
import { useAuth } from '../../src/hooks';
import { uploadUserPhoto } from '../../src/services/firebase/storage';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../src/constants/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, updateProfile, loading } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to upload a profile picture.'
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoUri || !user) {
      return undefined;
    }

    try {
      setUploading(true);

      // Convert URI to Blob
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const downloadURL = await uploadUserPhoto(user.uid, blob);

      setUploading(false);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploading(false);
      Alert.alert('Upload Failed', 'Unable to upload photo. Please try again.');
      return undefined;
    }
  };

  const handleComplete = async () => {
    if (!user) {
      return;
    }

    try {
      // Upload photo if selected
      let photoURL: string | undefined;
      if (photoUri) {
        photoURL = await uploadPhoto();
      }

      // Update profile
      const updates: any = {};
      if (bio) {
        updates.bio = bio;
      }
      if (photoURL) {
        updates.photoURL = photoURL;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
      }

      // Navigation will be handled by auth state
    } catch (err: any) {
      Alert.alert('Error', 'Unable to complete profile setup. Please try again.');
    }
  };

  const handleSkip = () => {
    // User can skip profile setup
    // Navigation will be handled by auth state
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Add a photo and bio to help others in the community know you
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoContainer}
              onPress={handlePickImage}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Tap to {photoUri ? 'change' : 'add'} your profile picture
            </Text>
          </View>

          <Input
            label="Bio (Optional)"
            placeholder="Tell us a bit about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            maxLength={200}
            style={styles.bioInput}
            helperText={`${bio.length}/200 characters`}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⏳ Your profile is pending moderation approval
            </Text>
            <Text style={styles.infoText}>
              📧 You'll receive an email once your profile is approved
            </Text>
            <Text style={styles.infoText}>
              ✅ This typically takes 24-48 hours
            </Text>
          </View>

          <Button
            title="Complete Setup"
            onPress={handleComplete}
            loading={loading || uploading}
            fullWidth
            style={styles.button}
          />

          <Button
            title="Skip for Now"
            variant="text"
            onPress={handleSkip}
            disabled={loading || uploading}
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderIcon: {
    fontSize: 40,
    marginBottom: SPACING.xs,
  },
  photoPlaceholderText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  photoHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  button: {
    marginBottom: SPACING.md,
  },
});
