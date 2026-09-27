import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthDivider,
  AuthMessage,
  AuthScreen,
  Button,
  Checkbox,
  Input,
  LegalLinkText,
} from '../../src/components';
import { useAuth } from '../../src/hooks';
import { MINIMUM_USER_AGE, SignUpErrors, validateSignUp } from '../../src/types';
import { COLORS, FONTS } from '../../src/constants/theme';

const EMPTY_FORM = { displayName: '', email: '', password: '', confirmPassword: '' };

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Already confirmed on the welcome screen; shown again so the account carries it
  const [isAdult, setIsAdult] = useState(true);
  const [formErrors, setFormErrors] = useState<SignUpErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors = validateSignUp({ displayName, email, password, confirmPassword, isAdult });
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
    if (!isAdult) {
      setFormErrors({ isAdult: validateSignUp({ ...EMPTY_FORM, isAdult }).isAdult });
      return;
    }
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

      <Checkbox
        label={`I am ${MINIMUM_USER_AGE} or older`}
        checked={isAdult}
        onChange={(checked) => {
          setIsAdult(checked);
          setFormErrors((current) => ({ ...current, isAdult: undefined }));
        }}
        error={formErrors.isAdult}
      />

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
        By creating an account, you agree to our <LegalLinkText document="terms" /> and{' '}
        <LegalLinkText document="privacy" />.
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
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
  },
});
