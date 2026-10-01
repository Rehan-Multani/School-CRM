import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { brandTheme as t, radius, spacing } from '../theme';

// OTP entry for the pre-auth screens (login, forgot password), so it uses the
// platform brand. One hidden TextInput behind N boxes — keeps paste + SMS
// autofill working.
export default function OtpBoxes({ value, length, onChange, onDone, onFocus }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 250);
    return () => clearTimeout(id);
  }, []);

  const change = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
  };

  return (
    <Pressable
      onPress={() => {
        onFocus?.();
        ref.current?.focus();
      }}
      style={styles.otpRow}
    >
      {Array.from({ length }).map((_, i) => {
        const char = value[i] || '';
        const current = focused && i === Math.min(value.length, length - 1);
        return (
          <View key={i} style={[styles.otpBox, char && styles.otpBoxFilled, current && styles.otpBoxActive]}>
            <Text style={styles.otpChar}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={change}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onDone}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        caretHidden
        style={styles.otpHidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: t.primary, backgroundColor: t.surface },
  otpBoxActive: { borderColor: t.primary, borderWidth: 2, backgroundColor: t.surface },
  otpChar: { fontSize: 22, fontWeight: '800', color: t.text },
  otpHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
