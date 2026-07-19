import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ClaimedOffer } from '../types';
import { Button } from './Button';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

interface RedemptionModalProps {
  visible: boolean;
  claimedOffer: ClaimedOffer | null;
  onClose: () => void;
}

export const RedemptionModal: React.FC<RedemptionModalProps> = ({
  visible,
  claimedOffer,
  onClose,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!claimedOffer) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const now = Date.now();
      const expiresAt = claimedOffer.redemption.expiresAt.toMillis();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [claimedOffer]);

  if (!claimedOffer) return null;

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isExpired = timeRemaining === 0;
  const isUrgent = timeRemaining < 5 * 60 * 1000; // Less than 5 minutes

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Your Offer Code</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Offer Badge */}
            <View style={styles.offerBadgeContainer}>
              <Text style={styles.offerBadge}>{claimedOffer.badge}</Text>
              <Text style={styles.offerTitle}>{claimedOffer.title}</Text>
              <Text style={styles.venueName}>{claimedOffer.venueName}</Text>
            </View>

            {/* Timer */}
            <View style={[styles.timerContainer, isUrgent && styles.timerUrgent]}>
              {!isExpired ? (
                <>
                  <Text style={styles.timerLabel}>Time Remaining</Text>
                  <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                    {formatTimeRemaining(timeRemaining)}
                  </Text>
                  <Text style={styles.timerSubtext}>
                    {isUrgent ? '⚠️ Expiring soon!' : 'Show this code to staff'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.expiredIcon}>⏰</Text>
                  <Text style={styles.expiredText}>This code has expired</Text>
                  <Text style={styles.expiredSubtext}>
                    You can claim the offer again if it's still available
                  </Text>
                </>
              )}
            </View>

            {/* Redemption Code */}
            {!isExpired && (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Redemption Code</Text>
                <View style={styles.codebox}>
                  <Text style={styles.codeText}>{claimedOffer.redemption.code}</Text>
                </View>
              </View>
            )}

            {/* QR Code Placeholder */}
            {!isExpired && (
              <View style={styles.qrContainer}>
                <Text style={styles.qrLabel}>Or scan this QR code</Text>
                <View style={styles.qrPlaceholder}>
                  {/* In production, use react-native-qrcode-svg */}
                  <Text style={styles.qrPlaceholderText}>📱</Text>
                  <Text style={styles.qrSubtext}>QR Code</Text>
                  <Text style={styles.qrNote}>
                    (Install react-native-qrcode-svg{'\n'}to display actual QR code)
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>How to Redeem</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1.</Text>
                <Text style={styles.instructionText}>
                  Show this screen to venue staff
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2.</Text>
                <Text style={styles.instructionText}>
                  They'll scan the QR code or enter the code
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3.</Text>
                <Text style={styles.instructionText}>
                  Enjoy your {claimedOffer.badge.toLowerCase()}!
                </Text>
              </View>
            </View>

            {/* Terms */}
            {claimedOffer.terms && (
              <View style={styles.terms}>
                <Text style={styles.termsTitle}>Terms & Conditions</Text>
                <Text style={styles.termsText}>{claimedOffer.terms}</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.footer}>
            <Button
              title={isExpired ? 'Close' : 'Done'}
              onPress={onClose}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  offerBadgeContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  offerBadge: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  offerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  venueName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  timerContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  timerUrgent: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  timerLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timerText: {
    fontSize: 48,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: '#FF9800',
  },
  timerSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  expiredIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  expiredText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  expiredSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  codeContainer: {
    marginBottom: SPACING.lg,
  },
  codeLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  codebox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 36,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  qrPlaceholderText: {
    fontSize: 64,
  },
  qrSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  qrNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  instructions: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  instructionNumber: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    width: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  terms: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  termsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  termsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
