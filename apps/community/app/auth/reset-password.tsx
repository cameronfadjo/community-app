import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthMessage, AuthScreen, Button, Input } from '../../src/components';
import { useAuth } from '../../src/hooks';
import { COLORS, FONTS } from '../../src/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string }>({});
  const [message, setMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string } = {};

    if (!email) {
      errors.email = 'Enter your email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "That doesn't look like an email address";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async () => {
    setMessage(null);
    if (!validateForm()) {
      return;
    }

    try {
      await sendPasswordReset(email);
      setEmailSent(true);
    } catch (err: any) {
      setMessage(err.message || "We couldn't send the email. Try again.");
    }
  };

  const backToSignIn = () => (router.canGoBack() ? router.back() : router.replace('/auth/login'));

  if (emailSent) {
    return (
      <AuthScreen
        title="Check your email"
        subtitle="If there's an account for that address, a link to reset your password is on its way."
      >
        <AuthMessage message={message} />

        <View style={styles.sentTo}>
          <Text style={styles.sentToLabel}>Sent to</Text>
          <Text style={styles.sentToEmail}>{email}</Text>
        </View>

        <Text style={styles.note}>The link works for one hour. Check your spam folder if you don't see it.</Text>

        <Button title="Back to sign in" onPress={backToSignIn} fullWidth style={styles.button} />
        <Button
          title="Send it again"
          variant="outline"
          onPress={handleResetPassword}
          loading={loading}
          fullWidth
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
    >
      <AuthMessage message={message} />

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

      <Button
        title="Send reset link"
        onPress={handleResetPassword}
        loading={loading}
        fullWidth
        style={styles.button}
      />

      <Button title="Back to sign in" variant="text" onPress={backToSignIn} fullWidth />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    marginBottom: 12,
  },
  sentTo: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    marginBottom: 16,
  },
  sentToLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  sentToEmail: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
});
