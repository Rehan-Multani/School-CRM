import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ROLE_LIST, ROLES } from '../api/roles';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { PlatformLogo } from '../components/Logos';
import TopInsetBackdrop from '../components/TopInsetBackdrop';
import { devCredentials } from '../lib/devCredentials';
import { toast } from '../lib/notify';
import { BRAND_HERO_COLORS as HERO_COLORS, brandTheme as t, font, radius, spacing } from '../theme';

// Login is pre-auth, so it always uses the platform brand (not a school theme).

export default function Login() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  // Coming back from Forgot password lands on the same role tab + login id.
  const params = useLocalSearchParams();
  const initialRole = ROLES[params.role] ? params.role : 'TEACHER';
  const [roleKey, setRoleKey] = useState(initialRole);
  const [identifier, setIdentifier] = useState(() => params.identifier || devCredentials(initialRole).identifier);
  const [password, setPassword] = useState(() => (params.identifier ? '' : devCredentials(initialRole).password));
  const [loading, setLoading] = useState(false);

  const role = ROLES[roleKey];

  const onSubmit = async () => {
    if (!identifier.trim() || !password) {
      toast.info('Please enter your credentials to continue.');
      return;
    }
    setLoading(true);
    try {
      await login(roleKey, identifier, password);
      toast.success('Signed in successfully!');
      router.replace(role.home);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (key) => {
    if (key === roleKey) return;
    const dev = devCredentials(key);
    setRoleKey(key);
    setIdentifier(dev.identifier);
    setPassword(dev.password);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
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

          <Input
            label={role.identifierLabel}
            icon={roleKey === 'DRIVER' ? 'call-outline' : 'person-outline'}
            value={identifier}
            onChangeText={setIdentifier}
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
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Enter your password"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            style={{ marginBottom: spacing.sm }}
          />

          <Pressable
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: { role: roleKey, identifier: identifier.trim() } })
            }
            hitSlop={8}
            style={styles.forgot}
            accessibilityRole="link"
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Button title="Sign in" loadingTitle="Signing in..." onPress={onSubmit} loading={loading} style={{ marginTop: spacing.xs }} />

          <View style={styles.helpRow}>
            <Ionicons name="help-circle-outline" size={16} color={t.textMuted} />
            <Text style={styles.help}>Trouble signing in? Contact your school office.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={t.textMuted} />
          <Text style={styles.footerText}>School CRM · v{Constants.expoConfig?.version || '1.0.0'}</Text>
        </View>

        {__DEV__ ? (
          <View style={styles.toastTestRow}>
            <Text style={styles.toastTestLabel}>Test Toasts:</Text>
            <Pressable
              onPress={() => toast.info('This is an info toast notification.')}
              style={[styles.toastTestBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              accessibilityRole="button"
            >
              <Ionicons name="information-circle" size={13} color="#2563EB" />
              <Text style={[styles.toastTestText, { color: '#1D4ED8' }]}>Info</Text>
            </Pressable>
            <Pressable
              onPress={() => toast.success('Operation completed successfully!', 'Success')}
              style={[styles.toastTestBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
              <Text style={[styles.toastTestText, { color: '#047857' }]}>Success</Text>
            </Pressable>
            <Pressable
              onPress={() => toast.error('Something went wrong. Please try again.', 'Error')}
              style={[styles.toastTestBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              accessibilityRole="button"
            >
              <Ionicons name="alert-circle" size={13} color="#DC2626" />
              <Text style={[styles.toastTestText, { color: '#B91C1C' }]}>Error</Text>
            </Pressable>
          </View>
        ) : null}
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

  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
  help: { color: t.textMuted, fontSize: font.sm },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  footerText: { color: t.textMuted, fontSize: font.xs, letterSpacing: 0.3 },

  toastTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  toastTestLabel: {
    fontSize: font.xs,
    fontWeight: '700',
    color: t.textMuted,
    marginRight: 2,
  },
  toastTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toastTestText: {
    fontSize: font.xs,
    fontWeight: '700',
  },
});
