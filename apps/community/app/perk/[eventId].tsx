import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components/events';
import { useAuth } from '../../src/hooks/useAuth';
import { useEventStore } from '../../src/store/eventStore';
import { usePerkStore } from '../../src/store/perkStore';
import { getRedemptionState, getSecondsLeft } from '../../src/types';
import { formatClock } from '../../src/utils/events';
import { COLORS, FONTS } from '../../src/constants/theme';

// Long enough that it can't happen by accident in a pocket or a crowd
const HOLD_TO_REDEEM_MS = 1200;

const formatCountdown = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** "10:04:27 PM": the ticking seconds show this is live, not a screenshot */
const formatLiveClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export default function PerkScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();
  const usingSampleData = useEventStore((state) => state.usingSampleData);
  const { perks, loadForEvent, redeem } = usePerkStore();

  const userId = user?.uid ?? null;
  const sample = usingSampleData;

  const [nowMs, setNowMs] = useState(Date.now());
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (eventId) {
      loadForEvent(eventId, { userId, sample }).catch((e) =>
        console.error('[Perk] Error loading redemption:', e)
      );
    }
  }, [eventId, userId, sample, loadForEvent]);

  const close = () =>
    router.canGoBack() ? router.back() : router.replace(`/event/${eventId ?? ''}`);

  const perk = eventId ? perks[eventId] : undefined;

  if (!perk) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.plainTitle}>No perk unlocked</Text>
        <Text style={styles.plainText}>Perks unlock on the event page once you're at the door.</Text>
        <PrimaryButton title="Back" variant="secondary" onPress={close} />
      </SafeAreaView>
    );
  }

  const state = getRedemptionState(perk, nowMs);

  const handleRedeem = async () => {
    setError(null);
    try {
      await redeem(perk.eventId, { userId, sample });
    } catch (e) {
      console.error('[Perk] Error redeeming:', e);
      setError("That didn't go through. Check the connection and hold again.");
    } finally {
      setHolding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.close}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={[styles.card, state !== 'unlocked' && styles.cardSpent]}>
          <View style={styles.cardTop}>
            <View style={styles.status}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: state === 'expired' ? COLORS.textTertiary : COLORS.secondary },
                ]}
              />
              <Text style={styles.statusText}>
                {state === 'unlocked' ? "You're here" : state === 'redeemed' ? 'Redeemed' : 'Expired'}
              </Text>
            </View>
            {state === 'unlocked' && (
              <Text style={styles.countdown} accessibilityLabel="Time left">
                {formatCountdown(getSecondsLeft(perk.expiresAtMs, nowMs))} left
              </Text>
            )}
          </View>

          <Text style={styles.perkLabel}>{perk.perkLabel}</Text>
          <Text style={styles.where}>
            {perk.venueName} · {perk.eventTitle}
          </Text>

          <View style={styles.panel}>
            {state === 'unlocked' && (
              <>
                <View style={styles.liveRow}>
                  <Text style={styles.liveLabel}>Live right now</Text>
                  <Text style={styles.liveClock}>{formatLiveClock(nowMs)}</Text>
                </View>

                <Pressable
                  style={[styles.hold, holding && styles.holdActive]}
                  delayLongPress={HOLD_TO_REDEEM_MS}
                  onPressIn={() => setHolding(true)}
                  onPressOut={() => setHolding(false)}
                  onLongPress={handleRedeem}
                  accessibilityRole="button"
                  accessibilityLabel="Staff: press and hold to redeem"
                >
                  <Text style={styles.holdText}>
                    {holding ? 'Keep holding...' : 'Staff: press and hold to redeem'}
                  </Text>
                </Pressable>

                <Text style={styles.panelNote}>
                  {error ?? 'Show this screen to your bartender. No code to type and nothing to scan.'}
                </Text>
              </>
            )}

            {state === 'redeemed' && (
              <View style={styles.result}>
                <MaterialCommunityIcons name="check-circle" size={48} color={COLORS.secondary} />
                <Text style={styles.resultTitle}>Redeemed</Text>
                <Text style={styles.panelNote}>
                  {perk.redeemedAtMs ? `At ${formatClock(perk.redeemedAtMs)}. ` : ''}Enjoy your night.
                </Text>
              </View>
            )}

            {state === 'expired' && (
              <View style={styles.result}>
                <MaterialCommunityIcons name="clock-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.resultTitle}>This perk ran out of time</Text>
                <Text style={styles.panelNote}>Perks last 15 minutes once unlocked.</Text>
              </View>
            )}
          </View>
        </View>

        {state !== 'unlocked' && (
          <PrimaryButton
            title="See what else is on"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/tonight')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  plainTitle: {
    fontFamily: FONTS.black,
    fontSize: 24,
    color: COLORS.text,
  },
  plainText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
  },
  cardSpent: {
    backgroundColor: '#4A4A60',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  countdown: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textInverse,
  },
  perkLabel: {
    fontFamily: FONTS.black,
    fontSize: 34,
    lineHeight: 38,
    color: COLORS.textInverse,
    marginBottom: 4,
  },
  where: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.textInverse,
    marginBottom: 20,
  },
  panel: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  liveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  liveLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  liveClock: {
    fontFamily: FONTS.black,
    fontSize: 22,
    color: COLORS.text,
  },
  hold: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdActive: {
    backgroundColor: COLORS.secondary,
  },
  holdText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textInverse,
  },
  panelNote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  result: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultTitle: {
    fontFamily: FONTS.black,
    fontSize: 22,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
});
