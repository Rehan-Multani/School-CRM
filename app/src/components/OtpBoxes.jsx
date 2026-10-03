import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { brandTheme as t, radius, spacing } from '../theme';

/**
 * 6-digit OTP input for pre-auth flows (Login, Forgot Password, Verification).
 * Uses real native TextInputs per box so tapping ANY box immediately opens the
 * native soft keyboard on all Android and iOS devices without touch-swallowing bugs.
 */
export default function OtpBoxes({ value = '', length = 6, onChange, onDone, onFocus, disabled = false }) {
  const inputs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const valStr = String(value || '');

  // Auto-focus the first unfilled box on screen load
  useEffect(() => {
    const target = Math.min(valStr.length, length - 1);
    const id = setTimeout(() => {
      inputs.current[target]?.focus();
    }, 250);
    return () => clearTimeout(id);
  }, []);

  const handleChange = (text, index) => {
    const cleaned = text.replace(/\D/g, '');

    // 1. Paste / SMS OTP autofill (e.g. "123456")
    if (cleaned.length > 1) {
      const fullDigits = cleaned.slice(0, length);
      onChange?.(fullDigits);
      const nextFocus = Math.min(fullDigits.length, length - 1);
      inputs.current[nextFocus]?.focus();
      if (fullDigits.length === length) {
        onDone?.();
      }
      return;
    }

    // 2. Single digit typed
    const chars = (value || '').split('');
    while (chars.length < index) chars.push('');
    chars[index] = cleaned;
    const nextValue = chars.join('').slice(0, length);
    onChange?.(nextValue);

    if (cleaned && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (nextValue.length === length && index === length - 1) {
      onDone?.();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!valStr[index] && index > 0) {
        const chars = valStr.split('');
        chars[index - 1] = '';
        onChange?.(chars.join(''));
        inputs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.otpRow}>
      {Array.from({ length }).map((_, i) => {
        const char = valStr[i] || '';
        const isFocused = focusedIndex === i;
        const isFilled = Boolean(char);

        return (
          <TextInput
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={char}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            onFocus={() => {
              setFocusedIndex(i);
              onFocus?.();
            }}
            onBlur={() => {
              if (focusedIndex === i) setFocusedIndex(-1);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            maxLength={length}
            selectTextOnFocus
            editable={!disabled}
            textAlign="center"
            style={[
              styles.otpBox,
              isFilled && styles.otpBoxFilled,
              isFocused && styles.otpBoxActive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surfaceAlt,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: t.text,
    padding: 0,
  },
  otpBoxFilled: {
    borderColor: t.primary,
    backgroundColor: t.surface,
  },
  otpBoxActive: {
    borderColor: t.primary,
    borderWidth: 2,
    backgroundColor: t.surface,
  },
});
