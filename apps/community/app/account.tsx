import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../src/components';
import { useAuth } from '../src/hooks';
import { useEventStore } from '../src/store/eventStore';
import { usePerkStore } from '../src/store/perkStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { sendVerificationEmail } from '../src/services/firebase/auth';
import { getRedemptionState } from '../src/types';
import { formatClock } from '../src/utils/events';
import { COLORS, FONTS } from '../src/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const PROMISES: Array<{ icon: IconName; title: string; detail: string }> = [
  {
    icon: 'eye-off-outline',
    title: 'No public profile',
    detail: "Other people using the app can't see you or what you do.",
  },
  {
    icon: 'map-marker-off-outline',
    title: "Your location isn't saved",
    detail: "It's checked on your phone when you tap I'm here, then forgotten.",
  },
  {
    icon: 'ticket-confirmation-outline',
    title: 'Perks are remembered',
    detail: 'We keep a record of perks you unlock, so each one is used once. Venues see totals, never who.',
  },
];

const STATE_LABELS = {
  unlocked: 'Unlocked',
  redeemed: 'Redeemed',
  expired: 'Ran out of time',
};

const formatDay = (ms: number): string =>
  new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export default function AccountScreen() {
  const router = useRouter();
  const { user, profile, isEmailVerified, signOut, deleteAccount, loading } = useAuth();
  const usingSampleData = useEventStore((state) => state.usingSampleData);
  const { perks, loadMine } = usePerkStore();
  const notificationsOn = useNotificationStore((state) => state.prefs.enabled);

  const userId = user?.uid ?? null;
  const [nowMs] = useState(Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMine({ userId, sample: usingSampleData }).catch((e) =>
      console.error('[Account] Error loading perks:', e)
    );
  }, [userId, usingSampleData, loadMine]);

  const history = useMemo(
    () => Object.values(perks).sort((a, b) => b.unlockedAtMs - a.unlockedAtMs),
    [perks]
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  const handleSignOut = async () => {
    setNotice(null);
    try {
      await signOut();
      usePerkStore.setState({ perks: {} });
      close();
    } catch (e) {
      console.error('[Account] Error signing out:', e);
      setNotice("We couldn't sign you out. Try again.");
    }
  };

  const handleDelete = async () => {
    setNotice(null);
    setDeleting(true);
    try {
      await deleteAccount();
      usePerkStore.setState({ perks: {} });
      close();
    } catch (e: any) {
      console.error('[Account] Error deleting account:', e);
      setNotice(e.message || "We couldn't delete your account. Try again.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleResend = async () => {
    setNotice(null);
    setSending(true);
    try {
      await sendVerificationEmail();
      setNotice(`We sent a new link to ${user?.email}.`);
    } catch (e) {
      console.error('[Account] Error sending verification:', e);
      setNotice("We couldn't send the email. Wait a minute and try again.");
    } finally {
      setSending(false);
    }
  };

  const name = profile?.displayName || 'Your account';
  const initial = (profile?.displayName ?? user?.email ?? '').trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Account</Text>
          <TouchableOpacity
            style={styles.close}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {notice && (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        )}

        {user ? (
          <>
            <View style={styles.card}>
              <View style={styles.identity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>

              {!isEmailVerified && (
                <View style={styles.verify}>
                  <Text style={styles.verifyText}>
                    Your email isn't confirmed yet. Open the link we sent you.
                  </Text>
                  <Button
                    title="Send the link again"
                    variant="outline"
                    size="small"
                    onPress={handleResend}
                    loading={sending}
                  />
                </View>
              )}
            </View>

            <View>
              <Text style={styles.sectionTitle}>Your perks</Text>
              {history.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    Perks you unlock at the door will be listed here.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {history.map((perk) => {
                    const state = getRedemptionState(perk, nowMs);
                    return (
                      <TouchableOpacity
                        key={perk.eventId}
                        style={styles.row}
                        onPress={() => router.push(`/perk/${perk.eventId}`)}
                        accessibilityRole="button"
                      >
                        <View style={styles.rowText}>
                          <Text style={styles.rowTitle}>{perk.perkLabel}</Text>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {perk.venueName} · {formatDay(perk.unlockedAtMs)},{' '}
                            {formatClock(perk.unlockedAtMs)}
                          </Text>
                        </View>
                        <Text
                          style={[styles.rowState, state === 'unlocked' && styles.rowStateActive]}
                        >
                          {STATE_LABELS[state]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.name}>You're browsing without an account</Text>
            <Text style={styles.signedOutText}>
              That's all you need to find something and go. An account is only for unlocking perks
              when you arrive.
            </Text>
            <View style={styles.actions}>
              <Button title="Sign in" onPress={() => router.push('/auth/login')} fullWidth />
              <Button
                title="Create an account"
                variant="outline"
                onPress={() => router.push('/auth/register')}
                fullWidth
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.primaryDark} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Nudges</Text>
            <Text style={styles.rowMeta}>
              {notificationsOn ? 'On' : 'Off'} · reminders when something is about to start
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View>
          <Text style={styles.sectionTitle}>Your privacy</Text>
          <View style={styles.card}>
            {PROMISES.map((promise, index) => (
              <View key={promise.title} style={[styles.promise, index > 0 && styles.promiseDivider]}>
                <MaterialCommunityIcons name={promise.icon} size={22} color={COLORS.primaryDark} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{promise.title}</Text>
                  <Text style={styles.promiseDetail}>{promise.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {user && !confirmingDelete && (
          <View style={styles.accountActions}>
            <Button
              title="Sign out"
              variant="outline"
              onPress={handleSignOut}
              loading={loading}
              fullWidth
            />
            <Button
              title="Delete my account"
              variant="text"
              onPress={() => setConfirmingDelete(true)}
              textStyle={styles.deleteText}
              fullWidth
            />
          </View>
        )}

        {user && confirmingDelete && (
          <View style={[styles.card, styles.deleteCard]} accessibilityRole="alert">
            <Text style={styles.name}>Delete your account?</Text>
            <Text style={styles.signedOutText}>
              This removes your sign-in, your name and email, and your record of perks. It can't be
              undone. You can keep browsing without an account.
            </Text>
            <View style={styles.actions}>
              <Button
                title="Delete my account"
                onPress={handleDelete}
                loading={deleting}
                style={styles.deleteButton}
                fullWidth
              />
              <Button
                title="Keep my account"
                variant="outline"
                onPress={() => setConfirmingDelete(false)}
                disabled={deleting}
                fullWidth
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: COLORS.text,
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
  notice: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
  },
  noticeText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.black,
    fontSize: 24,
    color: COLORS.primaryDark,
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.black,
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.text,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  verify: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    alignItems: 'flex-start',
  },
  verifyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  signedOutText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.black,
    fontSize: 21,
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 2,
  },
  rowMeta: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowState: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  rowStateActive: {
    color: COLORS.accent,
  },
  accountActions: {
    gap: 4,
  },
  deleteText: {
    color: COLORS.error,
  },
  deleteCard: {
    borderColor: COLORS.error,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  promiseDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  promiseDetail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
});
