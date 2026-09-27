import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  PERK_OPENS_MINUTES_BEFORE,
  formatDistanceLabel,
  getPerkAvailability,
  getSecondsLeft,
} from '../../types';
import { EventWithDistance } from '../../services/api/events';
import { calculateDistance } from '../../services/firebase/geolocation';
import { useAuth } from '../../hooks/useAuth';
import { useEventStore } from '../../store/eventStore';
import { usePerkStore } from '../../store/perkStore';
import { getCurrentLocation } from '../../utils/location';
import { countSignal } from '../../services/api/signals';
import { formatClock } from '../../utils/events';
import { COLORS, FONTS } from '../../constants/theme';

interface PerkCardProps {
  event: EventWithDistance;
}

const formatCountdown = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * The perk on an event page. Walks someone from "when you arrive" through
 * checking they are there, signing in, and unlocking.
 */
export const PerkCard: React.FC<PerkCardProps> = ({ event }) => {
  const router = useRouter();
  const { user } = useAuth();
  const usingSampleData = useEventStore((state) => state.usingSampleData);
  const setUserLocation = useEventStore((state) => state.setUserLocation);
  const { perks, loadForEvent, unlock, setPendingReturnPath } = usePerkStore();

  // Sample events skip the location and sign-in checks so the flow can be tried
  const sample = usingSampleData;
  const userId = user?.uid ?? null;

  const [nowMs, setNowMs] = useState(Date.now());
  // Set by a fresh check when the person says they have arrived
  const [checkedDistanceKm, setCheckedDistanceKm] = useState<number | undefined>(undefined);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadForEvent(event.id, { userId, sample }).catch((e) =>
      console.error('[Perk] Error loading redemption:', e)
    );
  }, [event.id, userId, sample, loadForEvent]);

  const perk = perks[event.id] ?? null;

  const availability = getPerkAvailability({
    event: {
      perkLabel: event.perkLabel,
      status: event.status,
      startsAtMs: event.startsAt.toMillis(),
      endsAtMs: event.endsAt.toMillis(),
    },
    nowMs,
    isSignedIn: sample || Boolean(userId),
    distanceKm: sample ? 0 : checkedDistanceKm,
    redemption: perk,
  });

  if (availability === 'none' || availability === 'ended') {
    return null;
  }

  const perkPath = `/perk/${event.id}` as const;

  const checkArrival = async () => {
    countSignal(event.id, 'perkView');
    setWorking(true);
    setMessage(null);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        setMessage('Turn on location so we can tell when you are at the door.');
        return;
      }
      setUserLocation(location);

      const { latitude, longitude } = event.location.coordinates;
      const distanceKm = calculateDistance(location.latitude, location.longitude, latitude, longitude);
      setCheckedDistanceKm(distanceKm);
    } finally {
      setWorking(false);
    }
  };

  const handleUnlock = async () => {
    countSignal(event.id, 'perkView');
    setWorking(true);
    setMessage(null);
    try {
      await unlock(event, { userId, sample });
      router.push(perkPath);
    } catch (e) {
      console.error('[Perk] Error unlocking:', e);
      setMessage("We couldn't unlock it. Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  };

  const handleSignIn = () => {
    countSignal(event.id, 'perkView');
    setPendingReturnPath(`/event/${event.id}`);
    router.push('/auth/login');
  };

  let note: string;
  let action: { label: string; onPress: () => void } | null = null;

  switch (availability) {
    case 'not_yet': {
      const opensAtMs = event.startsAt.toMillis() - PERK_OPENS_MINUTES_BEFORE * 60 * 1000;
      note = `Unlocks at the door from ${formatClock(opensAtMs)}.`;
      break;
    }
    case 'needs_location':
      note = "Nothing to claim ahead of time. Tap when you're at the door.";
      action = { label: "I'm here", onPress: checkArrival };
      break;
    case 'too_far':
      note =
        checkedDistanceKm !== undefined
          ? `You're ${formatDistanceLabel(checkedDistanceKm)} away. It unlocks at the door.`
          : 'It unlocks at the door.';
      action = { label: 'Check again', onPress: checkArrival };
      break;
    case 'needs_sign_in':
      note = "You're here. Sign in to unlock it.";
      action = { label: 'Sign in to unlock', onPress: handleSignIn };
      break;
    case 'ready':
      note = sample
        ? 'Sample event: the location and sign-in checks are skipped.'
        : `You're here. You'll have 15 minutes to show it at the bar.`;
      action = { label: 'Unlock now', onPress: handleUnlock };
      break;
    case 'unlocked':
      note = `Unlocked. ${formatCountdown(getSecondsLeft(perk?.expiresAtMs ?? 0, nowMs))} left to show it at the bar.`;
      action = { label: 'Show your perk', onPress: () => router.push(perkPath) };
      break;
    case 'redeemed':
      note = 'Redeemed. Enjoy.';
      break;
    case 'expired':
      note = 'This perk ran out of time.';
      break;
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialCommunityIcons
            name={availability === 'redeemed' ? 'check-bold' : 'ticket-confirmation-outline'}
            size={22}
            color={COLORS.textInverse}
          />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{event.perkLabel} when you arrive</Text>
          <Text style={styles.note}>{message ?? note}</Text>
        </View>
      </View>

      {action && (
        <TouchableOpacity
          style={[styles.button, working && styles.buttonDisabled]}
          onPress={action.onPress}
          disabled={working}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{working ? 'One moment...' : action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: COLORS.accentLight,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B2A52',
  },
  button: {
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textInverse,
  },
});
