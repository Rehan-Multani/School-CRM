import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { Badge } from '../kit';
import { pickupStatus } from './pickupStatus';
import { toast } from '../../lib/notify';
import { alpha, font, radius, spacing } from '../../theme';

// Copy the OTP, then wipe it from the clipboard after a minute (only if nothing
// else was copied meanwhile) so a code is not left lying around. The native
// module is loaded lazily: a build made before expo-clipboard was added falls
// back to a hint instead of crashing.
let wipeTimer = null;
async function copyOtp(otp) {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(otp);
    clearTimeout(wipeTimer);
    wipeTimer = setTimeout(async () => {
      try {
        if ((await Clipboard.getStringAsync()) === otp) await Clipboard.setStringAsync('');
      } catch {
        // best effort
      }
    }, 60000);
    return true;
  } catch {
    return false;
  }
}

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Display-only live Safe Pickup OTP — the SAME code the guardian was texted. It
// renders nothing unless the session carries an `otp`, and the code is never
// logged or stored: it exists only in props/state.
export default function PickupOtpCard({ session, childName }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const otp = session?.otp ? String(session.otp) : '';
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const onCopy = async () => {
    const ok = await copyOtp(otp);
    if (!ok) {
      toast('Press and hold the digits to copy the OTP.', 'info');
      return;
    }
    setCopied(true);
    toast('OTP copied', 'success');
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2500);
  };

  // `receivedAt` is stamped by useActivePickup when the data arrived; the detail
  // screen has none, so the mount time stands in. Seconds-remaining is immune to
  // device clock skew; the expiry timestamp is the fallback.
  const [mountedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  let left = null;
  if (typeof session?.otpSecondsRemaining === 'number') {
    left = Math.max(0, Math.ceil(session.otpSecondsRemaining - (now - (session.receivedAt || mountedAt)) / 1000));
  } else if (session?.otpExpiresAt) {
    const t = new Date(session.otpExpiresAt).getTime();
    if (Number.isFinite(t)) left = Math.max(0, Math.ceil((t - now) / 1000));
  }

  if (!otp) return null;
  const expired = left === 0;
  const urgent = left != null && left > 0 && left <= 60;
  const st = pickupStatus(session.status);
  const who = childName || session.studentName || 'your child';
  const timerColor = expired ? theme.danger : urgent ? theme.warning : theme.textMuted;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.iconTile, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.12) }]}>
          <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pickup OTP</Text>
          <Text style={styles.sub} numberOfLines={2}>
            Pickup started for {who}
          </Text>
        </View>
        <Badge label={st.label} tone={st.tone} />
      </View>

      {expired ? (
        <View style={[styles.expired, { backgroundColor: alpha(theme.danger, theme.isDark ? 0.18 : 0.08) }]}>
          <Ionicons name="time-outline" size={18} color={theme.danger} />
          <Text style={[styles.expiredText, { color: theme.danger }]}>OTP expired — ask the school to resend</Text>
        </View>
      ) : (
        <View style={styles.digits} accessible accessibilityLabel={`OTP ${otp.split('').join(' ')}`}>
          {otp.split('').map((d, i) => (
            <View key={i} style={styles.box}>
              <Text selectable style={styles.digit}>
                {d}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoRow}>
        <Ionicons name={expired ? 'alert-circle-outline' : 'time-outline'} size={16} color={timerColor} />
        <Text style={[styles.infoText, { color: timerColor, fontWeight: '700' }]}>
          {expired ? 'Expired' : left != null ? `Expires in ${mmss(left)}` : 'Valid for a few minutes'}
        </Text>
        {!expired ? (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel="Copy OTP"
            hitSlop={8}
            style={({ pressed }) => [
              styles.copyBtn,
              { backgroundColor: alpha(theme.primary, copied ? 0.18 : theme.isDark ? 0.2 : 0.12) },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={theme.primary} />
            <Text style={[styles.copyText, { color: theme.primary }]}>{copied ? 'Copied' : 'Copy OTP'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons name="lock-closed-outline" size={16} color={theme.textMuted} />
        <Text style={styles.infoText}>Tell this OTP only to the staff member at the school gate.</Text>
      </View>
      <View style={[styles.infoRow, { marginTop: spacing.xs }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.textMuted} />
        <Text style={styles.infoText}>
          {session.maskedMobile ? `Same OTP sent by SMS to ${session.maskedMobile}` : 'Same OTP sent by SMS'}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    sub: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    digits: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    box: {
      flex: 1,
      height: 58,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: t.border,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    digit: { fontSize: 26, fontWeight: '800', color: t.primary },
    expired: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    expiredText: { flex: 1, fontSize: font.sm, fontWeight: '700' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    infoText: { flex: 1, fontSize: font.sm, color: t.textMuted, lineHeight: 18 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
    copyText: { fontSize: font.sm, fontWeight: '800' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginTop: spacing.md },
  });
