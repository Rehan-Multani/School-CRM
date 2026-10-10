import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { brandTheme as t, radius, spacing } from '../theme';

/**
 * 6-digit OTP input for Login, Forgot Password and Pickup Verification.
 *
 * ONE real TextInput holds the whole code and sits invisibly on top of the
 * boxes; the boxes only DISPLAY its digits. The code therefore always has a
 * single source of truth, so a digit can never go missing or land in the wrong
 * box (the old design kept one TextInput per box and rebuilt the code with
 * `join('')`, which dropped empty slots — typed digits vanished). Tapping
 * anywhere on the boxes focuses the input and opens the keyboard; backspace,
 * paste and SMS autofill all behave natively.
 */
function OtpBoxes({ value = '', length = 6, onChange, onDone, onFocus, disabled = false }) {
  const inputRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const [focused, setFocused] = useState(false);

  // Keep the newest callback so the deferred "done" call below never runs a stale one.
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const digits = String(value || '').replace(/\D/g, '').slice(0, length);
  const activeIndex = Math.min(digits.length, length - 1);

  // Open the keyboard as soon as the screen appears.
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, []);

  const handleChange = (text) => {
    const next = String(text || '').replace(/\D/g, '').slice(0, length);
    onChange?.(next);
    // Fire once, when the last digit arrives. Deferred so the parent has
    // re-rendered with the full code before the callback reads it.
    if (next.length === length && digits.length < length) {
      setTimeout(() => onDoneRef.current?.(), 0);
    }
  };

  // A tap always (re)opens the keyboard — even when the input still holds focus
  // after the keyboard was dismissed with the back button, where tapping the
  // already-focused field does nothing on Android.
  const openKeyboard = () => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    input.blur();
    setTimeout(() => input.focus(), 30);
  };

  return (
    <Pressable style={styles.wrap} onPress={openKeyboard} accessible={false}>
      <View style={styles.otpRow} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const char = digits[i] || '';
          return (
            <View
              key={i}
              style={[
                styles.otpBox,
                Boolean(char) && styles.otpBoxFilled,
                focused && !disabled && i === activeIndex && styles.otpBoxActive,
              ]}
            >
              <Text style={styles.digit}>{char}</Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={handleChange}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        editable={!disabled}
        caretHidden
        contextMenuHidden
        autoCorrect={false}
        accessibilityLabel={`Enter the ${length}-digit OTP`}
        selectionColor="transparent"
        pointerEvents="none"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

// The screens around it re-render every second (resend countdown); the input must not.
export default memo(OtpBoxes);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: spacing.md, // breathing room under the heading / label above
    marginBottom: spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm, // visible gap between boxes, whatever the screen width
  },
  otpBox: {
    flex: 1, // boxes share the row, so six of them always fit with the gaps
    maxWidth: 52,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
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
  digit: {
    fontSize: 22,
    fontWeight: '800',
    color: t.text,
  },
  // Sits under the boxes; taps are handled by the wrapping Pressable, which
  // focuses it. Transparent text/caret/selection keep it invisible.
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 22,
    padding: 0,
  },
});
