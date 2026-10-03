import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { ROLE_LIST, ROLES } from '../api/roles';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { PlatformLogo } from '../components/Logos';
import OtpSignIn from '../components/OtpSignIn';
import TopInsetBackdrop from '../components/TopInsetBackdrop';
import { devCredentials } from '../lib/devCredentials';
import { toast } from '../lib/notify';
import { useKeyboardScroll } from '../lib/useKeyboard';
import { BRAND_HERO_COLORS as HERO_COLORS, brandTheme as t, font, radius, spacing } from '../theme';

// Login is pre-auth, so it always uses the platform brand (not a school theme).
// Teacher and transport manager sign in with a password; student and parent with the
// mobile number given at admission + an SMS OTP (`role.auth`, see api/roles.js).

export default function Login() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  const {
    scrollRef,
    keyboardHeight,
    keyboardVisible,
    scrollToInput,
  } = useKeyboardScroll({ defaultOffset: 170 });
  // Coming back from Forgot password lands on the same role tab + login id.
  const params = useLocalSearchParams();
  const initialRole = ROLES[params.role] ? params.role : 'TEACHER';
  const [roleKey, setRoleKey] = useState(initialRole);
  const [identifier, setIdentifier] = useState(() => params.identifier || devCredentials(initialRole).identifier);
  const [password, setPassword] = useState(() => (params.identifier ? '' : devCredentials(initialRole).password));
  const [roleMismatch, setRoleMismatch] = useState(null);
  const [loading, setLoading] = useState(false);

  const role = ROLES[roleKey];

  const switchRole = (key, overrideIdentifier) => {
    setRoleMismatch(null);
    if (key === roleKey && overrideIdentifier === undefined) return;
    const dev = devCredentials(key);
    setRoleKey(key);
    setIdentifier(overrideIdentifier !== undefined ? overrideIdentifier : dev.identifier);
    setPassword(overrideIdentifier !== undefined ? '' : dev.password);
  };

  const onSubmit = async () => {
    if (!identifier.trim() || !password) {
      toast.info('Please enter your credentials to continue.');
      return;
    }
    setLoading(true);
    setRoleMismatch(null);
    try {
      await login(roleKey, identifier, password);
      toast.success('Signed in successfully!');
      router.replace(role.home);
    } catch (err) {
      toast.error(err.message || 'Login failed');
      if (err.code === 'ROLE_MISMATCH' || err.suggestedRole) {
        setRoleMismatch({ message: err.message, suggestedRole: err.suggestedRole });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingBottom: Math.max(
            insets.bottom + spacing.xl,
            keyboardVisible ? (keyboardHeight || 300) + spacing.xl + 60 : 0,
          ),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero lives inside the ScrollView so the card can overlap it without being clipped. */}
        <LinearGradient
          colors={HERO_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}
        >
          <View style={[styles.ring, styles.ringLg]} />
          <View style={[styles.ring, styles.ringSm]} />

          <View style={styles.logoBox}>
            <PlatformLogo size={58} />
          </View>
          <Text style={styles.brand}>School CRM</Text>
          <Text style={styles.brandSub}>Smart school, connected families</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Select your role to access your account</Text>

          <View style={styles.segment}>
            {ROLE_LIST.map((r) => {
              const active = r.key === roleKey;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => switchRole(r.key)}
                  style={[styles.segItem, active && styles.segItemActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={r.icon} size={17} color={active ? t.primary : t.textMuted} />
                  <Text style={[styles.segText, active && styles.segTextActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {roleMismatch ? (
            <View style={styles.mismatchBanner}>
              <View style={styles.mismatchHeader}>
                <Ionicons name="alert-circle" size={20} color={t.danger} style={{ marginTop: 1 }} />
                <Text style={styles.mismatchText}>{roleMismatch.message}</Text>
              </View>
              {roleMismatch.suggestedRole && ROLES[roleMismatch.suggestedRole] ? (
                <Pressable
                  style={styles.switchButton}
                  onPress={() => switchRole(roleMismatch.suggestedRole, identifier)}
                  accessibilityRole="button"
                >
                  <Text style={styles.switchButtonText}>
                    Switch to {ROLES[roleMismatch.suggestedRole].label}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {role.auth === 'otp' ? (
            // Keyed by role so switching tab starts a clean OTP flow.
            <OtpSignIn
              key={roleKey}
              role={role}
              initialMobile={identifier}
              onSwitchRole={(nextRole, currentMobile) => switchRole(nextRole, currentMobile)}
              onFocusInput={(offset = 170) => scrollToInput(offset)}
            />
          ) : (
            <>
              <Input
                label={role.identifierLabel}
                icon={role.identifierKeyboard === 'email-address' ? 'mail-outline' : 'person-outline'}
                value={identifier}
                onChangeText={(v) => {
                  setIdentifier(v);
                  if (roleMismatch) setRoleMismatch(null);
                }}
                onFocus={() => scrollToInput(170)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={role.identifierKeyboard}
                placeholder={`Enter your ${role.identifierLabel.toLowerCase()}`}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <Input
                ref={passwordRef}
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (roleMismatch) setRoleMismatch(null);
                }}
                onFocus={() => scrollToInput(230)}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Enter your password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                style={{ marginBottom: spacing.sm }}
              />

              <Button title="Sign in" loadingTitle="Signing in..." onPress={onSubmit} loading={loading} style={{ marginTop: spacing.xs }} />
            </>
          )}

          <View style={styles.helpRow}>
            <Text style={styles.help}>Trouble signing in?</Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/forgot-password', params: { role: roleKey, identifier: identifier.trim() } })
              }
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text style={styles.helpLink}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={t.textMuted} />
          <Text style={styles.footerText}>School CRM · v{Constants.expoConfig?.version || '1.0.0'}</Text>
        </View>
      </ScrollView>
      <TopInsetBackdrop color={HERO_COLORS[0]} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },

  hero: {
    alignItems: 'center',
    paddingBottom: 96,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  ringLg: { width: 340, height: 340, borderRadius: 170, top: -150, right: -120 },
  ringSm: { width: 200, height: 200, borderRadius: 100, bottom: -90, left: -70 },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: t.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  brand: { color: t.white, fontSize: 26, fontWeight: '800', marginTop: spacing.lg, letterSpacing: 0.3 },
  brandSub: { color: 'rgba(255,255,255,0.72)', fontSize: font.md, marginTop: spacing.xs, letterSpacing: 0.2 },

  card: {
    marginTop: -64,
    marginHorizontal: spacing.lg,
    backgroundColor: t.surface,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 4,
    paddingBottom: spacing.xl,
    shadowColor: '#0A1A3F',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: 0.2, textAlign: 'center' },
  subtitle: { fontSize: font.md, color: t.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, textAlign: 'center' },

  segment: {
    flexDirection: 'row',
    backgroundColor: t.surfaceAlt,
    borderRadius: radius.md + 2,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, gap: 3 },
  segItemActive: {
    backgroundColor: t.surface,
    shadowColor: '#0A1A3F',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segText: { fontSize: font.sm, fontWeight: '600', color: t.textMuted },
  segTextActive: { color: t.primary, fontWeight: '700' },

  forgot: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: spacing.lg },
  forgotText: { color: t.primary, fontSize: font.md, fontWeight: '700' },

  mismatchBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  mismatchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  mismatchText: {
    flex: 1,
    color: '#991B1B',
    fontSize: font.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: t.primary,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    gap: 6,
    marginTop: 2,
    marginLeft: 28,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: font.xs,
    fontWeight: '700',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.lg,
  },
  errorText: { flex: 1, color: t.danger, fontSize: font.md },

  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  help: { color: t.textMuted, fontSize: font.sm },
  helpDot: { color: t.textMuted, fontSize: font.sm, marginHorizontal: 2 },
  helpLink: { color: t.primary, fontSize: font.sm, fontWeight: '700' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  footerText: { color: t.textMuted, fontSize: font.xs, letterSpacing: 0.3 },
});
