import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthDivider,
  AuthMessage,
  AuthScreen,
  Button,
  Input,
  LegalLinkText,
} from '../../src/components';
import { useAuth } from '../../src/hooks';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle, loading, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = 'Enter your email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "That doesn't look like an email address";
    }

    if (!password) {
      errors.password = 'Enter your password';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    setMessage(null);
    if (!validateForm()) {
      return;
    }

    try {
      clearError();
      await signIn(email, password);
      // Navigation will be handled by the root layout based on auth state
    } catch (err: any) {
      setMessage(err.message || "We couldn't sign you in. Check your details and try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage(null);
    try {
      clearError();
      await signInWithGoogle();
      // Navigation will be handled by the root layout based on auth state
    } catch (err: any) {
      setMessage(err.message || "We couldn't sign you in with Google. Try again.");
    }
  };

  return (
    <AuthScreen
      title="Sign in"
      subtitle="An account is only needed to unlock perks. Browsing stays open to everyone."
    >
      <AuthMessage message={message} />

      {/* Google sign-in opens a browser popup, which phones don't have */}
      {Platform.OS === 'web' && (
        <>
          <Button
            title="Continue with Google"
            variant="outline"
            onPress={handleGoogleSignIn}
            loading={loading}
            fullWidth
          />

          <AuthDivider label="or use email" />
        </>
      )}

      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={formErrors.email}
      />

      <Input
        label="Password"
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        error={formErrors.password}
      />

      <Button
        title="Forgot password?"
        variant="text"
        size="small"
        onPress={() => router.push('/auth/reset-password')}
        style={styles.forgot}
      />

      <Button title="Sign in" onPress={handleLogin} loading={loading} fullWidth />

      <View style={styles.other}>
        <Text style={styles.otherText}>New here?</Text>
        <Button
          title="Create an account"
          variant="outline"
          onPress={() => router.push('/auth/register')}
          fullWidth
        />
      </View>

      <Text style={styles.terms}>
        By signing in, you agree to our <LegalLinkText document="terms" /> and{' '}
        <LegalLinkText document="privacy" />.
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
  },
  other: {
    marginTop: 32,
    gap: 12,
  },
  otherText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  terms: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});
