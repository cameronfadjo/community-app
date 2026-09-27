import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';

const FLAG_COLORS = ['#E40303', '#FF8C00', '#FFED00', '#008026', '#004DFF', '#750787'];

interface AuthScreenProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Shared frame for the sign-in, sign-up, and reset screens */
export const AuthScreen: React.FC<AuthScreenProps> = ({ title, subtitle, children }) => {
  const router = useRouter();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/whats-on'));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.back}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.inner}>
            <View style={styles.flag} accessibilityElementsHidden importantForAccessibility="no">
              {FLAG_COLORS.map((color) => (
                <View key={color} style={[styles.flagStripe, { backgroundColor: color }]} />
              ))}
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

interface AuthMessageProps {
  message: string | null;
  tone?: 'error' | 'info';
}

/** Inline message, used in place of pop-up alerts so it also shows on the web */
export const AuthMessage: React.FC<AuthMessageProps> = ({ message, tone = 'error' }) => {
  if (!message) {
    return null;
  }
  return (
    <View
      style={[styles.message, tone === 'info' && styles.messageInfo]}
      accessibilityRole="alert"
    >
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

export const AuthDivider: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>{label}</Text>
    <View style={styles.dividerLine} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingTop: 24,
  },
  flag: {
    flexDirection: 'row',
    width: 72,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  flagStripe: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.black,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  message: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.errorLight,
    marginBottom: 16,
  },
  messageInfo: {
    backgroundColor: COLORS.primaryLight,
  },
  messageText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
