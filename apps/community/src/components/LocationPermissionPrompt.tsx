import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';

interface LocationPermissionPromptProps {
  onRequestPermission: () => void;
  onSkip?: () => void;
  loading?: boolean;
}

export const LocationPermissionPrompt: React.FC<LocationPermissionPromptProps> = ({
  onRequestPermission,
  onSkip,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Enable Location Access</Text>
        <Text style={styles.description}>
          To show you nearby LGBTQ+ venues and experiences, we need access to your location.
        </Text>
        <Text style={styles.privacy}>
          Your location is only used to find venues near you and is never shared with third parties.
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Enable Location"
            onPress={onRequestPermission}
            loading={loading}
            fullWidth
            style={styles.primaryButton}
          />
          {onSkip && !loading && (
            <Button
              title="Browse Without Location"
              variant="outline"
              onPress={onSkip}
              fullWidth
              style={styles.secondaryButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  icon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  privacy: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    marginBottom: 0,
  },
  secondaryButton: {
    marginBottom: 0,
  },
});
