import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components';
import { useAuth } from '../../src/hooks';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../src/constants/theme';

export default function ModerationPendingScreen() {
  const router = useRouter();
  const { signOut, refreshUserProfile, profile } = useAuth();

  const handleRefresh = async () => {
    await refreshUserProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const isRejected = profile?.moderationStatus === 'rejected';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isRejected ? '❌' : '⏳'}</Text>

        <Text style={styles.title}>
          {isRejected ? 'Profile Not Approved' : 'Profile Under Review'}
        </Text>

        <Text style={styles.message}>
          {isRejected
            ? 'Unfortunately, your profile was not approved by our moderation team.'
            : 'Your profile is currently being reviewed by our moderation team.'}
        </Text>

        {!isRejected && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next?</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>1.</Text>
              <Text style={styles.infoText}>
                Our team will review your profile within 24-48 hours
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>2.</Text>
              <Text style={styles.infoText}>
                You'll receive an email once your profile is approved
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>3.</Text>
              <Text style={styles.infoText}>
                Once approved, you'll have full access to the app
              </Text>
            </View>
          </View>
        )}

        {isRejected && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionTitle}>Possible reasons:</Text>
            <Text style={styles.rejectionText}>
              • Incomplete profile information
            </Text>
            <Text style={styles.rejectionText}>
              • Use of inappropriate content
            </Text>
            <Text style={styles.rejectionText}>
              • Violation of community guidelines
            </Text>
            <Text style={styles.rejectionText}>
              • Suspected fake or spam account
            </Text>
          </View>
        )}

        <View style={styles.whyBox}>
          <Text style={styles.whyTitle}>Why do we moderate?</Text>
          <Text style={styles.whyText}>
            We review all profiles to ensure Community remains a safe, welcoming
            space for LGBTQ+ travelers. This helps prevent spam, harassment, and
            maintains the quality of our community.
          </Text>
        </View>

        <Button
          title="Refresh Status"
          onPress={handleRefresh}
          fullWidth
          style={styles.button}
        />

        {isRejected && (
          <Button
            title="Contact Support"
            variant="outline"
            onPress={() => {
              // TODO: Implement support contact
            }}
            fullWidth
            style={styles.button}
          />
        )}

        <Button
          title="Sign Out"
          variant="text"
          onPress={handleSignOut}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  content: {
    maxWidth: 500,
    alignSelf: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  infoBox: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.lg,
    borderRadius: 12,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  infoBullet: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    width: 20,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  rejectionBox: {
    backgroundColor: COLORS.error + '10',
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  rejectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  rejectionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.sm,
  },
  whyBox: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 12,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  whyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  whyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  button: {
    marginBottom: SPACING.md,
  },
});
