import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ROLE_LIST, ROLES } from '../api/roles';
import { passwordResetApi } from '../api/passwordReset';
import { Button, Input } from '../components/ui';
import OtpBoxes from '../components/OtpBoxes';
import RoleSegment from '../components/RoleSegment';
import TopInsetBackdrop from '../components/TopInsetBackdrop';
import { useKeyboardScroll } from '../lib/useKeyboard';
import { BRAND_HERO_COLORS as HERO_COLORS, brandTheme as t, font, radius, spacing } from '../theme';

// Pre-auth like login, so it always uses the platform brand (not a school theme).
const STEPS = ['Account', 'Verify OTP', 'New password'];
const MIN_PASSWORD_LEN = 8;

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const {
    scrollRef,
    keyboardHeight,
    keyboardVisible,
    scrollToInput,
  } = useKeyboardScroll({ defaultOffset: 180 });
  const [roleKey, setRoleKey] = useState(ROLES[params.role] ? params.role : 'TEACHER');
  const [identifier, setIdentifier] = useState(params.identifier || '');
  const [step, setStep] = useState(0); // 0 account · 1 otp · 2 password · 3 done
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(6);
  const [resendIn, setResendIn] = useState(0);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmRef = useRef(null);

  const [serverChannel, setServerChannel] = useState('');

  const role = ROLES[roleKey];
  const isEmail = (serverChannel || role.otpChannel) === 'EMAIL';

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const run = async (fn) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = () => {
    if (!identifier.trim()) {
      setError(`Please enter your ${role.identifierLabel.toLowerCase()}.`);
      return;
    }
    run(async () => {
      const data = await passwordResetApi.requestOtp(roleKey, identifier);
      setOtpLength(data.otpLength || 6);
      setResendIn(data.resendIn || 30);
      setOtp(data.otp || (__DEV__ ? '123456' : ''));
      setServerChannel(data.channel === 'EMAIL' || data.channel === 'SMS' ? data.channel : '');
      setStep(1);
    });
  };

  const verifyOtp = () => {
    if (otp.length !== otpLength) {
      setError(`Enter the ${otpLength}-digit OTP.`);
      return;
    }
    run(async () => {
      const data = await passwordResetApi.verifyOtp(roleKey, identifier, otp);
      setResetToken(data.resetToken);
      setStep(2);
    });
  };

  const savePassword = () => {
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    run(async () => {
      await passwordResetApi.resetPassword(resetToken, password);
      setStep(3);
    });
  };

  const switchRole = (key) => {
    if (key === roleKey) return;
    setRoleKey(key);
    setServerChannel('');
    setIdentifier('');
    setError('');
  };

  const backToLogin = () =>
    router.replace({ pathname: '/login', params: { role: roleKey, identifier: identifier.trim() } });

  const goBack = () => {
    setError('');
    if (step === 1) setStep(0);
    else if (step === 2) setStep(0); // token is single-flow; start over rather than re-verify
    else if (router.canGoBack()) router.back();
    else backToLogin();
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
        <LinearGradient
          colors={HERO_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={[styles.ring, styles.ringLg]} />
          {step < 3 ? (
            <Pressable onPress={goBack} hitSlop={10} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={t.white} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <View style={styles.heroIcon}>
            <Ionicons name={step === 3 ? 'checkmark-done' : 'key-outline'} size={30} color={t.white} />
          </View>
          <Text style={styles.heroTitle}>{step === 3 ? 'All set!' : 'Forgot password'}</Text>
          <Text style={styles.heroSub}>
            {step === 3 ? 'Your password has been reset' : `Reset your ${role.label.toLowerCase()} account password`}
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          {step < 3 ? <Stepper step={step} /> : null}

          {step === 0 ? (
            <>
              <Text style={styles.title}>Find your account</Text>
              <Text style={styles.subtitle}>
                {role.otpChannel === 'EMAIL'
                  ? 'We will send an OTP to your registered email address.'
                  : 'We will send an OTP to your registered mobile number.'}
              </Text>

              <RoleSegment roles={ROLE_LIST} value={roleKey} onChange={(key) => switchRole(key)} style={styles.segment} />

              <Input
                label={role.identifierLabel}
                icon={role.identifierKeyboard === 'phone-pad' ? 'call-outline' : 'person-outline'}
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => scrollToInput(180)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={role.identifierKeyboard}
                placeholder={`Enter your ${role.identifierLabel.toLowerCase()}`}
                returnKeyType="send"
                onSubmitEditing={sendOtp}
              />
              <ErrorBox message={error} />
              <Button title="Send OTP" icon="paper-plane-outline" onPress={sendOtp} loading={loading} loadingTitle="Sending OTP..." />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={[styles.subtitle, isEmail && { marginBottom: spacing.xs }]}>
                {isEmail
                  ? `Enter the ${otpLength}-digit OTP sent to your email`
                  : `Enter the ${otpLength}-digit OTP sent to your mobile number`}
              </Text>
              {isEmail ? <Text style={[styles.subtitle, { marginTop: 0 }]}>Check your inbox and spam folder.</Text> : null}
              <View style={styles.idChip}>
                <Ionicons name={role.icon} size={15} color={t.primary} />
                <Text style={styles.idChipText} numberOfLines={1}>
                  {identifier.trim()}
                </Text>
                <Pressable onPress={goBack} hitSlop={8}>
                  <Text style={styles.link}>Change</Text>
                </Pressable>
              </View>

              <OtpBoxes
                value={otp}
                length={otpLength}
                onChange={setOtp}
                onDone={verifyOtp}
                onFocus={() => scrollToInput(180)}
              />
              <ErrorBox message={error} />
              <Button title="Verify OTP" icon="shield-checkmark-outline" onPress={verifyOtp} loading={loading} loadingTitle="Verifying OTP..." />

              <View style={styles.resendRow}>
                <Text style={styles.muted}>Didn&apos;t get it?</Text>
                {resendIn > 0 ? (
                  <Text style={styles.muted}>Resend in {resendIn}s</Text>
                ) : (
                  <Pressable onPress={sendOtp} disabled={loading} hitSlop={8}>
                    <Text style={styles.link}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.title}>Set a new password</Text>
              <Text style={styles.subtitle}>Use at least {MIN_PASSWORD_LEN} characters.</Text>
              <Input
                label="New password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                onFocus={() => scrollToInput(180)}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Enter new password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <Input
                ref={confirmRef}
                label="Confirm password"
                icon="lock-closed-outline"
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => scrollToInput(240)}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Re-enter new password"
                returnKeyType="done"
                onSubmitEditing={savePassword}
                error={confirm && confirm !== password ? 'Passwords do not match' : ''}
              />
              <ErrorBox message={error} />
              <Button title="Reset password" icon="checkmark-circle-outline" onPress={savePassword} loading={loading} loadingTitle="Resetting password..." />
            </>
          ) : null}

          {step === 3 ? (
            <View style={{ alignItems: 'center' }}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={38} color={t.white} />
              </View>
              <Text style={styles.title}>Password updated</Text>
              <Text style={styles.subtitle}>
                You can now sign in with your new password.
              </Text>
              <Button title="Back to sign in" icon="log-in-outline" onPress={backToLogin} style={{ alignSelf: 'stretch' }} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <TopInsetBackdrop color={HERO_COLORS[0]} />
    </KeyboardAvoidingView>
  );
}

function Stepper({ step }) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, (done || active) && styles.stepDotOn]}>
              {done ? (
                <Ionicons name="checkmark" size={13} color={t.white} />
              ) : (
                <Text style={[styles.stepNum, active && { color: t.white }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, (done || active) && styles.stepLabelOn]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={18} color={t.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },

  hero: {
    alignItems: 'center',
    paddingBottom: 84,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  ringLg: { width: 320, height: 320, borderRadius: 160, top: -140, right: -110 },
  back: {
    alignSelf: 'flex-start',
    marginLeft: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: spacing.sm,
  },
  heroTitle: { color: t.white, fontSize: 24, fontWeight: '800', marginTop: spacing.md, letterSpacing: 0.3 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: font.md, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.lg },

  card: {
    marginTop: -56,
    marginHorizontal: spacing.lg,
    backgroundColor: t.surface,
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: '#0A1A3F',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: { fontSize: font.xl, fontWeight: '800', color: t.text, textAlign: 'center' },
  subtitle: { fontSize: font.md, color: t.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, lineHeight: 20, textAlign: 'center' },

  stepper: { flexDirection: 'row', marginBottom: spacing.xl },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceAlt,
    borderWidth: 1,
    borderColor: t.border,
  },
  stepDotOn: { backgroundColor: t.primary, borderColor: t.primary },
  stepNum: { fontSize: font.sm, fontWeight: '700', color: t.textMuted },
  stepLabel: { fontSize: font.xs, color: t.textMuted, fontWeight: '600' },
  stepLabelOn: { color: t.primary },

  segment: { marginBottom: spacing.xl },

  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: t.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
  },
  idChipText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },

  resendRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
  muted: { color: t.textMuted, fontSize: font.md },
  link: { color: t.primary, fontSize: font.md, fontWeight: '700' },

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
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, color: t.danger, fontSize: font.md },

  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: t.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: t.success,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});
