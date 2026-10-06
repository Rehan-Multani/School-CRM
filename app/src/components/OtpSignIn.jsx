import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { otpLoginApi } from '../api/otpLogin';
import { ROLES } from '../api/roles';
import { Button, Input } from './ui';
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

// Student / parent sign-in on the login card:
// Step 1: User enters the 10-digit mobile number given at admission.
// Step 2: "Send OTP" requests the verification code and routes to the dedicated `/verify-otp` screen.
export default function OtpSignIn({ role, initialMobile, onFocusInput, onSwitchRole }) {
  const [mobile, setMobile] = useState(() => (isMobile(toMobile(initialMobile)) ? toMobile(initialMobile) : ''));
  const [loading, setLoading] = useState(false);
  const [roleMismatch, setRoleMismatch] = useState(null);

  useEffect(() => {
    if (initialMobile) {
      const cleaned = toMobile(initialMobile);
      if (isMobile(cleaned)) setMobile(cleaned);
    }
  }, [initialMobile]);

  const sendOtp = async () => {
    if (!isMobile(mobile)) {
      toast.info('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setRoleMismatch(null);
    try {
      const data = await otpLoginApi.requestOtp(role.key, mobile);
      router.push({
        pathname: '/verify-otp',
        params: {
          role: role.key,
          mobile,
          otpLength: data.otpLength || 6,
          resendIn: data.resendIn || 30,
          notice: data.message || '',
          devOtp: __DEV__ ? (data.otp || '123456') : '',
        },
      });
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
      if (err.code === 'ROLE_MISMATCH' || err.suggestedRole) {
        setRoleMismatch({ message: err.message, suggestedRole: err.suggestedRole });
      }
    } finally {
      setLoading(false);
    }
  };

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
                Switch to{' '}
                {ROLES[roleMismatch.suggestedRole]?.label || 'the right role'}
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
      <Text style={styles.hint}>
        Use the mobile number given to the school at admission. We will send an OTP to it.
      </Text>
      <Button
        title="Send OTP"
        icon="paper-plane-outline"
        loadingTitle="Sending OTP..."
        onPress={sendOtp}
        loading={loading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hint: { color: t.textMuted, fontSize: font.sm, lineHeight: 18, marginBottom: spacing.lg },
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
