import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthDivider, AuthMessage, AuthScreen, Button, Input } from '../../src/components';
import { useAuth } from '../../src/hooks';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: {
      displayName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!displayName) {
      errors.displayName = 'Enter a name';
    } else if (displayName.length < 2) {
      errors.displayName = 'Use at least 2 characters';
    }

    if (!email) {
      errors.email = 'Enter your email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "That doesn't look like an email address";
    }

    if (!password) {
      errors.password = 'Choose a password';
    } else if (password.length < 6) {
      errors.password = 'Use at least 6 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Enter your password again';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "The passwords don't match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setMessage(null);
    if (!validateForm()) {
      return;
    }

    try {
      clearError();
      await signUp(email, password, displayName);
      // Navigation will be handled by the root layout based on auth state
    } catch (err: any) {
      setMessage(err.message || "We couldn't create your account. Try again.");
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
      title="Create an account"
      subtitle="It takes a minute, and it's only needed to unlock perks. You have no public profile."
    >
      <AuthMessage message={message} />

      <Button
        title="Continue with Google"
        variant="outline"
        onPress={handleGoogleSignIn}
        loading={loading}
        fullWidth
      />

      <AuthDivider label="or use email" />

      <Input
        label="Name"
        placeholder="What should we call you?"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        error={formErrors.displayName}
        helperText="Only you see this"
      />

      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={formErrors.email}
        helperText="We'll send a link to confirm it"
      />

      <Input
        label="Password"
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        error={formErrors.password}
      />

      <Input
        label="Password again"
        placeholder="Enter it once more"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        error={formErrors.confirmPassword}
      />

      <Button
        title="Create account"
        onPress={handleRegister}
        loading={loading}
        fullWidth
        style={styles.submit}
      />

      <View style={styles.other}>
        <Text style={styles.otherText}>Already have an account?</Text>
        <Button
          title="Sign in"
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/auth/login'))}
          fullWidth
        />
      </View>

      <Text style={styles.terms}>
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  submit: {
    marginTop: 8,
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
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});
