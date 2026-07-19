import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { OfferType, PartnerTier } from '../../src/types';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../src/constants/theme';

export default function CreateOfferScreen() {
  const router = useRouter();
  const { venueId, venueName, partnerTier } = useLocalSearchParams<{
    venueId: string;
    venueName: string;
    partnerTier: PartnerTier;
  }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [offerType, setOfferType] = useState<OfferType>('percentage');
  const [value, setValue] = useState('');
  const [terms, setTerms] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('100');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState('1');
  const [validityDays, setValidityDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const offerTypes: { value: OfferType; label: string; icon: string }[] = [
    { value: 'percentage', label: 'Percentage Off', icon: '%' },
    { value: 'fixed_amount', label: 'Fixed Amount', icon: '$' },
    { value: 'free_item', label: 'Free Item', icon: '🎁' },
    { value: 'upgrade', label: 'Upgrade', icon: '⬆️' },
    { value: 'bogo', label: 'Buy One Get One', icon: '🎫' },
  ];

  const generateBadge = (): string => {
    switch (offerType) {
      case 'percentage':
        return `${value}% OFF`;
      case 'fixed_amount':
        return `$${value} OFF`;
      case 'free_item':
        return 'FREE ITEM';
      case 'upgrade':
        return 'FREE UPGRADE';
      case 'bogo':
        return 'BOGO';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an offer title');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter an offer description');
      return false;
    }

    if (offerType === 'percentage' || offerType === 'fixed_amount') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        Alert.alert('Error', 'Please enter a valid value');
        return false;
      }

      if (offerType === 'percentage' && numValue > 100) {
        Alert.alert('Error', 'Percentage cannot exceed 100%');
        return false;
      }
    }

    if (!terms.trim()) {
      Alert.alert('Error', 'Please enter terms and conditions');
      return false;
    }

    const maxRedeem = parseInt(maxRedemptions);
    if (isNaN(maxRedeem) || maxRedeem <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum redemptions');
      return false;
    }

    const maxPerUser = parseInt(maxRedemptionsPerUser);
    if (isNaN(maxPerUser) || maxPerUser <= 0 || maxPerUser > maxRedeem) {
      Alert.alert('Error', 'Please enter a valid max redemptions per user');
      return false;
    }

    const days = parseInt(validityDays);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Please enter a valid validity period');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const now = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validityDays));

      const offerData = {
        venueId,
        venueName,
        title: title.trim(),
        description: description.trim(),
        type: offerType,
        value: offerType === 'percentage' || offerType === 'fixed_amount' ? parseFloat(value) : 1,
        badge: generateBadge(),
        terms: terms.trim(),
        validFrom: now,
        validUntil,
        maxRedemptions: parseInt(maxRedemptions),
        maxRedemptionsPerUser: parseInt(maxRedemptionsPerUser),
        partnerTier: partnerTier || 'standard',
        featured: partnerTier === 'premium' || partnerTier === 'enterprise',
      };

      // TODO: Create offer in Firebase
      // await createOffer(offerData);

      Alert.alert(
        'Success',
        'Your offer has been created and is now pending review. It will be visible to users once approved.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Offer',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create New Offer</Text>
          <Text style={styles.subtitle}>for {venueName}</Text>
        </View>

        {/* Offer Type Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Offer Type *</Text>
          <View style={styles.typeGrid}>
            {offerTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  offerType === type.value && styles.typeButtonActive,
                ]}
                onPress={() => setOfferType(type.value)}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    offerType === type.value && styles.typeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Offer Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Happy Hour Special"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={60}
          />
          <Text style={styles.hint}>{title.length}/60 characters</Text>
        </View>

        {/* Value (for percentage and fixed_amount) */}
        {(offerType === 'percentage' || offerType === 'fixed_amount') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {offerType === 'percentage' ? 'Percentage' : 'Amount'} *
            </Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder={offerType === 'percentage' ? '25' : '10.00'}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
            {offerType === 'percentage' && (
              <Text style={styles.hint}>Enter percentage (1-100)</Text>
            )}
            {offerType === 'fixed_amount' && (
              <Text style={styles.hint}>Enter dollar amount</Text>
            )}
          </View>
        )}

        {/* Badge Preview */}
        <View style={styles.section}>
          <Text style={styles.label}>Badge Preview</Text>
          <View style={styles.badgePreview}>
            <Text style={styles.badgePreviewText}>
              {generateBadge() || 'Enter value to see badge'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your offer in detail..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.hint}>{description.length}/200 characters</Text>
        </View>

        {/* Terms */}
        <View style={styles.section}>
          <Text style={styles.label}>Terms & Conditions *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={terms}
            onChangeText={setTerms}
            placeholder="e.g., Valid Mon-Fri 4-7pm. Cannot be combined with other offers."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
          <Text style={styles.hint}>{terms.length}/300 characters</Text>
        </View>

        {/* Redemption Limits */}
        <View style={styles.section}>
          <Text style={styles.label}>Maximum Redemptions *</Text>
          <TextInput
            style={styles.input}
            value={maxRedemptions}
            onChangeText={setMaxRedemptions}
            placeholder="100"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>Total number of times this offer can be claimed</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Max Redemptions Per User *</Text>
          <TextInput
            style={styles.input}
            value={maxRedemptionsPerUser}
            onChangeText={setMaxRedemptionsPerUser}
            placeholder="1"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>How many times each user can claim this offer</Text>
        </View>

        {/* Validity Period */}
        <View style={styles.section}>
          <Text style={styles.label}>Validity Period (Days) *</Text>
          <TextInput
            style={styles.input}
            value={validityDays}
            onChangeText={setValidityDays}
            placeholder="30"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>How many days this offer will be available</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Creating Offer...' : 'Create Offer'}
          </Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Your offer will be reviewed before going live. You'll be notified once it's approved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    flexBasis: '48%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  typeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  typeLabelActive: {
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  badgePreview: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  badgePreviewText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textInverse,
  },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
