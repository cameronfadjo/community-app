import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../src/components';
import { legalLink } from '../../src/constants/legal';
import { LegalDocument } from '../../src/types';
import { COLORS, FONTS } from '../../src/constants/theme';

/**
 * Where a Terms or Privacy link lands when the page can't be opened,
 * usually because it hasn't been published yet.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document: LegalDocument = doc === 'privacy' ? 'privacy' : 'terms';
  const { title, url } = legalLink(document);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.back}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {url ? (
          <>
            <Text style={styles.text}>This opens in your browser.</Text>
            <Button title={`Open the ${title}`} onPress={() => Linking.openURL(url)} fullWidth />
          </>
        ) : (
          <Text style={styles.text}>
            This isn't published yet. It will be here before the app launches.
          </Text>
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
  back: {
    width: 44,
    height: 44,
    marginLeft: 12,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    gap: 16,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.text,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },
});
