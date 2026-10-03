import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { otpLoginApi } from '../api/otpLogin';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from './ui';
import OtpBoxes from './OtpBoxes';
import { toast } from '../lib/notify';
import { brandTheme as t, font, radius, spacing } from '../theme';

// "+91 98765 43210" / "098765 43210" → the 10 digits the backend matches on.
function toMobile(text) {
  let digits = String(text || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}
const isMobile = (v) => /^[6-9]\d{9}$/.test(v);

// Student / parent sign-in on the login card (pre-auth, so platform brand):
// mobile number given at admission → SMS OTP → (pick an account, when the
// number has more than one — siblings, or children in two schools) → signed in.
export default function OtpSignIn({ role, initialMobile, onFocusInput, onSwitchRole }) {
  const { adoptSession } = useAuth();
  const [stage, setStage] = useState('mobile'); // mobile · otp · choose
  const [mobile, setMobile] = useState(() => (isMobile(toMobile(initialMobile)) ? toMobile(initialMobile) : ''));
  const [otp, setOtp] = useState('');
  const [otpLength, setOtpLength] = useState(6);
  const [resendIn, setResendIn] = useState(0);
  const [notice, setNotice] = useState('');
  const [choice, setChoice] = useState(null); // { selectionToken, accounts }
  const [loading, setLoading] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState(null);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const run = async (fn) => {
    setLoading(true);
    setRoleMismatch(null);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message || 'Login failed');
      if (err.code === 'ROLE_MISMATCH' || err.suggestedRole) {
        setRoleMismatch({ message: err.message, suggestedRole: err.suggestedRole });
      }
    } finally {
      setLoading(false);
    }
  };

  const signedIn = async (data) => {
    await adoptSession(role.key, data);
    toast.success('Signed in successfully!');
    router.replace(role.home);
  };

  const changeNumber = () => {
    setOtp('');
    setChoice(null);
    setStage('mobile');
  };

  const sendOtp = () => {
    if (!isMobile(mobile)) {
      toast.info('Please enter a valid 10-digit mobile number.');
      return undefined;
    }
    return run(async () => {
      const data = await otpLoginApi.requestOtp(role.key, mobile);
      setOtpLength(data.otpLength || 6);
      setResendIn(data.resendIn || 30);
      setOtp(data.otp || (__DEV__ ? '123456' : ''));
      setNotice(data.message);
      setStage('otp');
    });
  };

  const verifyOtp = () => {
    if (otp.length !== otpLength) {
      toast.info(`Enter the ${otpLength}-digit OTP.`);
      return undefined;
    }
    return run(async () => {
      const data = await otpLoginApi.verifyOtp(role.key, mobile, otp);
      if (data.needsSelection) {
        setChoice(data);
        setStage('choose');
        return;
      }
      await signedIn(data);
    });
  };

  const choose = (accountId) =>
    run(async () => {
      try {
        await signedIn(await otpLoginApi.selectAccount(choice.selectionToken, accountId));
      } catch (err) {
        // The chooser is only valid for a few minutes — start over with a fresh OTP.
        if (err.code === 'SELECTION_INVALID') changeNumber();
        throw err;
      }
    });

  if (stage === 'choose') {
    return (
      <>
        <Text style={styles.title}>Choose account</Text>
        <Text style={styles.subtitle}>
          This number is linked to more than one {role.label.toLowerCase()} account.
        </Text>
        {choice.accounts.map((a) => (
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
        <Pressable onPress={changeNumber} disabled={loading} hitSlop={8} style={styles.centerLink}>
          <Text style={styles.link}>Use a different number</Text>
        </Pressable>
      </>
    );
  }

  if (stage === 'otp') {
    return (
      <>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>{notice}</Text>
        <View style={styles.idChip}>
          <Ionicons name="call-outline" size={15} color={t.primary} />
          <Text style={styles.idChipText}>+91 {mobile}</Text>
          <Pressable onPress={changeNumber} disabled={loading} hitSlop={8}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        </View>

        <OtpBoxes
          value={otp}
          length={otpLength}
          onChange={setOtp}
          onDone={verifyOtp}
          onFocus={() => onFocusInput?.(170)}
        />
        <Button
          title="Verify & sign in"
          icon="shield-checkmark-outline"
          onPress={verifyOtp}
          loading={loading}
          loadingTitle="Verifying OTP..."
        />

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
    );
  }

  return (
    <>
      {roleMismatch ? (
        <View style={styles.mismatchBanner}>
          <View style={styles.mismatchHeader}>
            <Ionicons name="alert-circle" size={18} color={t.danger} style={{ marginTop: 1 }} />
            <Text style={styles.mismatchText}>{roleMismatch.message}</Text>
          </View>
          {roleMismatch.suggestedRole && onSwitchRole ? (
            <Pressable
              style={styles.switchButton}
              onPress={() => onSwitchRole(roleMismatch.suggestedRole, mobile)}
              accessibilityRole="button"
            >
              <Text style={styles.switchButtonText}>
                Switch to {roleMismatch.suggestedRole === 'TRANSPORT' ? 'Transport' : roleMismatch.suggestedRole === 'TEACHER' ? 'Teacher' : roleMismatch.suggestedRole === 'PARENT' ? 'Parent' : 'Student'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Input
        label={role.identifierLabel}
        icon="call-outline"
        value={mobile}
        onChangeText={(v) => {
          setMobile(toMobile(v));
          if (roleMismatch) setRoleMismatch(null);
        }}
        onFocus={() => onFocusInput?.(170)}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="10-digit mobile number"
        returnKeyType="send"
        onSubmitEditing={sendOtp}
        style={{ marginBottom: spacing.sm }}
      />
      <Text style={styles.hint}>Use the mobile number given to the school at admission. We will send an OTP to it.</Text>
      <Button title="Send OTP" icon="paper-plane-outline" loadingTitle="Sending OTP..." onPress={sendOtp} loading={loading} />
    </>
  );
}

const styles = StyleSheet.create({
  hint: { color: t.textMuted, fontSize: font.sm, lineHeight: 18, marginBottom: spacing.lg },
  title: { fontSize: font.lg, fontWeight: '800', color: t.text, textAlign: 'center' },
  subtitle: {
    fontSize: font.md,
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
    backgroundColor: t.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.xl,
  },
  idChipText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },

  resendRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.lg },
  muted: { color: t.textMuted, fontSize: font.md },
  link: { color: t.primary, fontSize: font.md, fontWeight: '700' },
  centerLink: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },

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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceAlt,
  },
  avatarText: { color: t.primary, fontSize: font.lg, fontWeight: '800' },
  accountName: { color: t.text, fontSize: font.md, fontWeight: '700' },
  accountSub: { color: t.textMuted, fontSize: font.sm, marginTop: 2 },

  mismatchBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
});
