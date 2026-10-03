import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { subscribeConfirm } from '../lib/notify';
import { font, radius, spacing } from '../theme';

export default function ConfirmModalContainer() {
  const theme = useTheme();
  const [dialog, setDialog] = useState(null);
  const [scaleAnim] = useState(() => new Animated.Value(0.92));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    return subscribeConfirm((payload) => {
      if (payload) {
        setDialog(payload);
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }).start(() => setDialog(null));
      }
    });
  }, []);

  if (!dialog) return null;

  const isDark = Boolean(theme?.isDark);
  const isDestructive = Boolean(dialog.options?.destructive);
  const confirmColor = isDestructive ? theme.danger : theme.primary;

  const handleCancel = () => {
    if (dialog.resolve) dialog.resolve(false);
    setDialog(null);
  };

  const handleConfirm = () => {
    if (dialog.resolve) dialog.resolve(true);
    setDialog(null);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleCancel}>
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Animated.View
          style={[
            styles.box,
            {
              backgroundColor: isDark ? '#141C2F' : '#FFFFFF',
              borderColor: theme.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.15)' : theme.primarySoft },
            ]}
          >
            <Ionicons
              name={isDestructive ? 'alert-circle' : 'help-circle'}
              size={28}
              color={confirmColor}
            />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{dialog.title}</Text>
          {dialog.message ? (
            <Text style={[styles.message, { color: theme.textMuted }]}>{dialog.message}</Text>
          ) : null}

          <View style={styles.btnRow}>
            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: theme.text }]}>
                {dialog.options?.cancelText || 'Cancel'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmColor },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                {dialog.options?.confirmText || 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  box: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: font.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: font.md,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: font.md,
    fontWeight: '700',
  },
});
