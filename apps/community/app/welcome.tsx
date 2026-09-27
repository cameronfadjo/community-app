import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Checkbox, LegalLinkText } from '../src/components';
import { PrimaryButton } from '../src/components/events';
import { useWelcomeStore } from '../src/store/welcomeStore';
import { MINIMUM_USER_AGE } from '../src/types';
import { COLORS, FONTS } from '../src/constants/theme';

const FLAG_COLORS = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'];

/** Shown once, the first time the app opens on a device */
export default function WelcomeScreen() {
  const router = useRouter();
  const confirm = useWelcomeStore((state) => state.confirm);
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleJoin = async () => {
    if (!isAdult) {
      setError(`Community is for people aged ${MINIMUM_USER_AGE} and over.`);
      return;
    }
    await confirm();
    router.replace('/(tabs)/whats-on');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
            {FLAG_COLORS.map((color) => (
              <View key={color} style={[styles.flagStripe, { backgroundColor: color }]} />
            ))}
          </View>

          <Text style={styles.name}>Community</Text>
          <Text style={styles.heading}>Find somewhere to go.</Text>
          <Text style={styles.text}>
            Pick what you're up for, see what's on near you, and go. No account needed.
          </Text>

          <View style={styles.form}>
            <Checkbox
              label={`I am ${MINIMUM_USER_AGE} or older`}
              checked={isAdult}
              onChange={(checked) => {
                setIsAdult(checked);
                setError(undefined);
              }}
              error={error}
            />
            <PrimaryButton title="Join Community" onPress={handleJoin} />
          </View>

          <Text style={styles.terms}>
            By joining, you agree to our <LegalLinkText document="terms" /> and{' '}
            <LegalLinkText document="privacy" />.
          </Text>
        </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  inner: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  flag: {
    flexDirection: 'row',
    width: 72,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  flagStripe: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  heading: {
    fontFamily: FONTS.black,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: COLORS.text,
    marginBottom: 12,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    lineHeight: 25,
    color: COLORS.textSecondary,
  },
  form: {
    marginTop: 32,
    gap: 8,
  },
  terms: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
});
