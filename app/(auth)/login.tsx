import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/features/auth/AuthContext';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { C, FONT } from '../../src/constants/theme';

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('Email not confirmed')) return 'Please confirm your email before logging in.';
  if (message.includes('User not found')) return 'No account found with that email.';
  return message;
}

export default function LoginScreen() {
  const { signIn, session, isLoading: sessionLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!sessionLoading && session) {
    return <Redirect href="/(tabs)/quiz" />;
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const authError = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) setError(mapAuthError(authError.message));
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>К</Text>
          </View>
          <View>
            <Text style={styles.appName}>Kozak Training</Text>
            <Text style={styles.appSub}>Staff Learning Hub</Text>
          </View>
        </View>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to continue your training</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@kozak.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 40 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 24, fontFamily: FONT.bold },
  appName:  { color: C.text,    fontSize: 18, fontFamily: FONT.bold },
  appSub:   { color: C.textSub, fontSize: 12, fontFamily: FONT.regular, marginTop: 1 },
  heading:  { color: C.text,    fontSize: 28, fontFamily: FONT.extraBold, marginBottom: 6 },
  sub:      { color: C.textSub, fontSize: 15, fontFamily: FONT.regular, marginBottom: 32 },
  errorBox: {
    backgroundColor: C.errorMuted,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: C.error, fontSize: 13, fontFamily: FONT.regular },
  btn: { marginTop: 8 },
});
