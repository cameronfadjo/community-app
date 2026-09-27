import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { legalLink } from '../constants/legal';
import { LegalDocument, MINIMUM_USER_AGE } from '../types';
import { COLORS, FONTS } from '../constants/theme';

/** Opens the published page, or explains that it isn't published yet */
export const useOpenLegal = () => {
  const router = useRouter();

  return (document: LegalDocument) => {
    const { url } = legalLink(document);
    if (!url) {
      router.push(`/legal/${document}` as never);
      return;
    }
    Linking.openURL(url).catch(() => router.push(`/legal/${document}` as never));
  };
};

interface LegalLinkTextProps {
  document: LegalDocument;
}

/** A link for use inside a sentence */
export const LegalLinkText: React.FC<LegalLinkTextProps> = ({ document }) => {
  const open = useOpenLegal();
  return (
    <Text style={styles.link} onPress={() => open(document)} accessibilityRole="link">
      {legalLink(document).title}
    </Text>
  );
};

interface LegalLinksProps {
  /** Adds the line saying who the app is for */
  showAgeStatement?: boolean;
}

/** The footer shown on the account and sign-in screens */
export const LegalLinks: React.FC<LegalLinksProps> = ({ showAgeStatement = false }) => (
  <View style={styles.container}>
    {showAgeStatement && (
      <Text style={styles.text}>
        Community is for people aged {MINIMUM_USER_AGE} and over.
      </Text>
    )}
    <Text style={styles.text}>
      <LegalLinkText document="terms" />
      {'  ·  '}
      <LegalLinkText document="privacy" />
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
    marginTop: 24,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    // Tall enough to tap comfortably
    lineHeight: 28,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  link: {
    fontFamily: FONTS.bold,
    color: COLORS.primaryDark,
    textDecorationLine: 'underline',
  },
});
