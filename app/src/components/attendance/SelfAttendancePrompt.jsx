import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { Button } from '../ui';
import { alpha, font, radius, spacing } from '../../theme';

// Reminder to mark attendance. It comes back EVERY time the user opens the app,
// returns to Home, or brings the app back from the background, until today is
// marked present — "Remind me later" only hides it for now.
// Nothing is shown when the school has not enabled self attendance, when the
// day is already marked present, or on leave / holiday.
export default function SelfAttendancePrompt({ api, route }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const checking = useRef(false);
  const mounted = useRef(true);

  const setShown = useCallback((v) => {
    visibleRef.current = v;
    setVisible(v);
  }, []);

  const check = useCallback(async () => {
    if (checking.current || visibleRef.current) return;
    checking.current = true;
    try {
      const res = await api.today();
      if (!mounted.current || !res?.config?.enabled) return;
      const rec = res.record;
      const done = rec?.checkedIn || ['LEAVE', 'HOLIDAY'].includes(rec?.status);
      if (!done) setShown(true);
    } catch {
      /* a reminder must never get in the way of the app */
    } finally {
      checking.current = false;
    }
  }, [api, setShown]);

  // Home gains focus (app start, after login, coming back from another screen).
  useFocusEffect(
    useCallback(() => {
      check();
    }, [check]),
  );

  // App returns from the background.
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [check]);

  const close = () => setShown(false);
  const go = () => {
    setShown(false);
    router.push(route);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: alpha(theme.primary, 0.12) }]}>
            <Ionicons name="finger-print" size={34} color={theme.primary} />
          </View>
          <Text style={styles.title}>Mark your attendance</Text>
          <Text style={styles.body}>
            You have not marked yourself present today. You need to be at school and verify your fingerprint.
          </Text>
          <Button title="Mark Present" icon="finger-print-outline" onPress={go} style={{ marginTop: spacing.lg }} />
          <Pressable onPress={close} hitSlop={10} style={styles.later} accessibilityRole="button">
            <Text style={styles.laterText}>Remind me later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    card: { width: '100%', maxWidth: 380, backgroundColor: t.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center' },
    iconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: spacing.md, textAlign: 'center' },
    body: { fontSize: font.md, color: t.textMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 21 },
    later: { marginTop: spacing.md, paddingVertical: spacing.xs },
    laterText: { color: t.textMuted, fontWeight: '700', fontSize: font.md },
  });
