import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ROLES } from '../api/roles';
import { otpLoginApi } from '../api/otpLogin';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import OtpBoxes from '../components/OtpBoxes';
import TopInsetBackdrop from '../components/TopInsetBackdrop';
import { toast } from '../lib/notify';
import { useKeyboardScroll } from '../lib/useKeyboard';
import { BRAND_HERO_COLORS as HERO_COLORS, brandTheme as t, font, radius, spacing } from '../theme';

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { adoptSession } = useAuth();
  const { scrollRef, keyboardHeight, keyboardVisible, scrollToInput } = useKeyboardScroll({
    defaultOffset: 170,
  });

  const roleKey = ROLES[params.role] ? params.role : 'STUDENT';
  const role = ROLES[roleKey];
  const mobile = String(params.mobile || '').trim();

  const [stage, setStage] = useState('otp'); // 'otp' | 'choose'
  const [otp, setOtp] = useState(() => params.devOtp || (__DEV__ ? '123456' : ''));
  const [otpLength, setOtpLength] = useState(() => Number(params.otpLength) || 6);
  const [resendIn, setResendIn] = useState(() => Number(params.resendIn) || 30);
  const [notice, setNotice] = useState(
    () => params.notice || 'If this number is registered with your school, an OTP has been sent to it.'
  );
  const [choice, setChoice] = useState(null); // { selectionToken, accounts }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fallback if accessed without a mobile number
  useEffect(() => {
    if (!mobile) {
      router.replace({ pathname: '/login', params: { role: roleKey } });
    }
  }, [mobile, roleKey]);

  // Resend countdown timer
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
      const msg = err.message || 'Operation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signedIn = async (data) => {
    await adoptSession(roleKey, data);
    toast.success('Signed in successfully!');
    router.replace(role.home);
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/login', params: { role: roleKey, identifier: mobile } });
    }
  };

  const verifyOtp = () => {
    if (otp.length !== otpLength) {
      setError(`Please enter the ${otpLength}-digit OTP.`);
      return undefined;
    }
    return run(async () => {
      const data = await otpLoginApi.verifyOtp(roleKey, mobile, otp);
      if (data.needsSelection) {
        setChoice(data);
        setStage('choose');
        return;
      }
      await signedIn(data);
    });
  };

  const resendOtp = () => {
    return run(async () => {
      const data = await otpLoginApi.requestOtp(roleKey, mobile);
      setOtpLength(data.otpLength || 6);
      setResendIn(data.resendIn || 30);
      if (data.otp) setOtp(data.otp);
      else if (__DEV__) setOtp('123456');
      setNotice(data.message || 'OTP resent successfully');
      toast.success('OTP sent to your mobile number');
    });
  };

  const choose = (accountId) =>
    run(async () => {
      try {
        const sessionData = await otpLoginApi.selectAccount(choice.selectionToken, accountId);
        await signedIn(sessionData);
      } catch (err) {
        if (err.code === 'SELECTION_INVALID') {
          toast.error('Selection expired. Please verify OTP again.');
          setChoice(null);
          setStage('otp');
          return;
        }
        throw err;
      }
    });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingBottom: Math.max(
            insets.bottom + spacing.xl,
            keyboardVisible ? (keyboardHeight || 300) + spacing.xl + 60 : 0
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
          <View style={[styles.ring, styles.ringSm]} />

          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={12} style={styles.backButton} accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={22} color={t.white} />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>

          <View style={styles.heroIconBox}>
            <Ionicons name="shield-checkmark" size={34} color={t.primary} />
          </View>
          <Text style={styles.heroTitle}>Verify OTP</Text>
          <Text style={styles.heroSub}>
            {role?.label ? `${role.label} Verification` : 'Enter the code to sign in'}
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          {stage === 'choose' ? (
            <>
              <Text style={styles.title}>Choose account</Text>
              <Text style={styles.subtitle}>
                This number is linked to more than one {role.label.toLowerCase()} account.
              </Text>
              {choice?.accounts?.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => choose(a.id)}
                  disabled={loading}
                  style={({ pressed }) => [styles.account, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(a.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={styles.accountSub} numberOfLines={2}>
                      {[a.schoolName, a.detail].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                </Pressable>
              ))}
              <Pressable onPress={goBack} disabled={loading} hitSlop={8} style={styles.centerLink}>
                <Text style={styles.link}>Use a different number</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>{notice}</Text>

              <View style={styles.idChip}>
                <View style={styles.phoneIconBox}>
                  <Ionicons name="call" size={15} color={t.primary} />
                </View>
                <Text style={styles.idChipText}>+91 {mobile}</Text>
                <Pressable onPress={goBack} disabled={loading} hitSlop={8} style={styles.changeBtn}>
                  <Text style={styles.changeLink}>Change</Text>
                </Pressable>
              </View>

              <OtpBoxes
                value={otp}
                length={otpLength}
                onChange={(val) => {
                  setOtp(val);
                  if (error) setError('');
                }}
                onDone={verifyOtp}
                onFocus={() => scrollToInput(170)}
                disabled={loading}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={t.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Verify & sign in"
                icon="shield-checkmark-outline"
                onPress={verifyOtp}
                loading={loading}
                loadingTitle="Verifying OTP..."
                style={{ marginTop: spacing.md }}
              />

              <View style={styles.resendRow}>
                <Text style={styles.muted}>Didn&apos;t get it?</Text>
                {resendIn > 0 ? (
                  <Text style={styles.timerText}>Resend in {resendIn}s</Text>
                ) : (
                  <Pressable onPress={resendOtp} disabled={loading} hitSlop={8}>
                    <Text style={styles.link}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={t.textMuted} />
          <Text style={styles.footerText}>School CRM · Secure Authentication</Text>
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
    paddingBottom: 84,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  ringLg: { width: 340, height: 340, borderRadius: 170, top: -150, right: -120 },
  ringSm: { width: 200, height: 200, borderRadius: 100, bottom: -90, left: -70 },

  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  heroIconBox: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: t.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    marginTop: spacing.xs,
  },
  heroTitle: { color: t.white, fontSize: 24, fontWeight: '800', marginTop: spacing.md, letterSpacing: 0.3 },
  heroSub: { color: 'rgba(255,255,255,0.76)', fontSize: font.sm + 1, marginTop: 4, letterSpacing: 0.2 },

  card: {
    marginTop: -52,
    marginHorizontal: spacing.lg,
    backgroundColor: t.surface,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    shadowColor: '#0A1A3F',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  title: { fontSize: 22, fontWeight: '800', color: t.text, letterSpacing: 0.2, textAlign: 'center' },
  subtitle: {
    fontSize: font.sm + 1,
    color: t.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 20,
    textAlign: 'center',
  },

  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F1F4F9',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xl,
  },
  phoneIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idChipText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '700', letterSpacing: 0.5 },
  changeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  changeLink: { color: t.primary, fontSize: font.sm, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  errorText: { flex: 1, color: t.danger, fontSize: font.sm, fontWeight: '600' },

  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  muted: { color: t.textMuted, fontSize: font.sm },
  timerText: { color: t.textMuted, fontSize: font.sm, fontWeight: '700' },
  link: { color: t.primary, fontSize: font.sm, fontWeight: '700' },
  centerLink: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.md },

  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: t.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  avatarText: { color: t.primary, fontSize: font.lg, fontWeight: '800' },
  accountName: { color: t.text, fontSize: font.md, fontWeight: '700' },
  accountSub: { color: t.textMuted, fontSize: font.sm, marginTop: 2 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  footerText: { color: t.textMuted, fontSize: font.xs, letterSpacing: 0.3 },
});
