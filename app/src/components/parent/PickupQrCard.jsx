import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { qrSvgString } from '../../lib/pickupQr';
import { toast } from '../../lib/notify';
import QrCode from '../pickup/QrCode';
import { alpha, font, radius, spacing } from '../../theme';
import { Bone, SkeletonQrCard } from '../Skeleton';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const hhmm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function printHtml(qr, childName) {
  const cls = qr.className ? ` &middot; ${esc(qr.className)}${qr.sectionName ? '-' + esc(qr.sectionName) : ''}` : '';
  return `<html><body style="font-family:sans-serif;text-align:center;padding:32px">
<h2 style="margin:0">Safe Pickup QR</h2>
<p style="font-size:18px;margin:8px 0 20px">${esc(childName || qr.studentName)}${cls}</p>
${qrSvgString(qr.token, 360)}
<p style="margin-top:20px;font-size:15px">Valid until <b>${hhmm(qr.expiresAt)}</b> &mdash; show the live QR in the app if this has expired.</p>
<p style="color:#666;font-size:12px">Single use. Show only to school staff at the gate.</p>
</body></html>`;
}

// The child's rotating Safe Pickup QR (valid 5 min; each new one replaces the
// old). Refetches itself when it runs out, on focus, and on app resume. The
// token lives in component state only.
export default function PickupQrCard({ fetchQr, childName }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(null);
  const shotRef = useRef(null);
  const fetchRef = useRef(fetchQr);
  useEffect(() => {
    fetchRef.current = fetchQr;
  });
  const inflight = useRef(false);
  const lastTry = useRef(0);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    lastTry.current = Date.now();
    try {
      const r = await fetchRef.current();
      if (!aliveRef.current) return;
      setQr(r ? { ...r, expiresMs: r.expiresAt ? new Date(r.expiresAt).getTime() : 0, gotAt: Date.now() } : null);
      setError(null);
    } catch (e) {
      if (aliveRef.current) setError(e);
    } finally {
      inflight.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      aliveRef.current = true;
      load();
      const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
      return () => {
        aliveRef.current = false;
        sub.remove();
      };
    }, [load]),
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Seconds-remaining is measured from when the data arrived (immune to device
  // clock skew).
  const left = qr?.enabled && typeof qr.ttlSeconds === 'number' ? Math.max(0, Math.ceil(qr.ttlSeconds - (now - qr.gotAt) / 1000)) : null;

  // Expired: fetch the next one. If that fails, keep trying every 5s rather than
  // sitting on "Refreshing…" forever (and never hammer the server each second).
  useEffect(() => {
    if (!qr?.enabled || left !== 0) return;
    if (!inflight.current && Date.now() - lastTry.current >= 5000) load();
  }, [left, now, qr?.enabled, load]);

  const run = async (kind, fn) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      // errorText() hides runtime errors behind a generic line; this one needs the real reason.
      toast.error(String(e?.message || e || 'Unknown error').slice(0, 160), 'Could not complete that');
    } finally {
      setBusy(null);
    }
  };

  const onPrint = () => run('print', () => Print.printAsync({ html: printHtml(qr, childName) }));
  // Same path as the fee receipt PDF: render → share sheet ("Save to Files/Drive"),
  // falling back to the system print dialog (can "Save as PDF").
  const onDownload = () =>
    run('download', async () => {
      const html = printHtml(qr, childName);
      if (!(await Sharing.isAvailableAsync())) {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save pickup QR' });
    });
  const onShare = () =>
    run('share', async () => {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const uri = await captureRef(shotRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share pickup QR' });
    });

  // Before the first QR arrives: the card's own shape, pulsing.
  if (!qr && !error) return <SkeletonQrCard />;
  if (error && !qr) {
    return (
      <Pressable onPress={load} style={styles.card} accessibilityRole="button">
        <Text style={styles.sub}>Could not load the pickup QR. Tap to retry.</Text>
      </Pressable>
    );
  }
  if (!qr?.enabled) return null; // Safe Pickup is off for this school / class

  const urgent = left != null && left > 0 && left <= 60;
  const timerColor = left === 0 ? theme.danger : urgent ? theme.warning : theme.textMuted;
  const ready = left > 0;
  const off = !ready || Boolean(busy);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.iconTile, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.12) }]}>
          <Ionicons name="qr-code" size={22} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pickup QR</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {childName || qr.studentName} · show this to the staff at the gate
          </Text>
        </View>
      </View>

      <View style={styles.qrWrap}>
        <View ref={shotRef} collapsable={false} style={styles.qrBox}>
          {ready ? <QrCode value={qr.token} size={220} /> : <Bone w={220} h={220} r={radius.md} />}
        </View>
      </View>

      <View style={styles.timerRow}>
        <Ionicons name="time-outline" size={16} color={timerColor} />
        <Text style={[styles.timer, { color: timerColor }]}>{ready ? `Changes in ${mmss(left)}` : 'Refreshing…'}</Text>
      </View>
      <Text style={styles.note}>A new QR replaces this one automatically. Each QR works once.</Text>

      <View style={styles.actions}>
        <Action icon="download-outline" label="Download" busy={busy === 'download'} disabled={off} onPress={onDownload} theme={theme} styles={styles} />
        <Action icon="print-outline" label="Print" busy={busy === 'print'} disabled={off} onPress={onPrint} theme={theme} styles={styles} />
        <Action icon="share-social-outline" label="Share" busy={busy === 'share'} disabled={off} onPress={onShare} theme={theme} styles={styles} />
      </View>
    </View>
  );
}

function Action({ icon, label, busy, disabled, onPress, theme, styles }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.2 : 0.12) }, (disabled || pressed) && { opacity: disabled ? 0.5 : 0.7 }]}
    >
      {busy ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name={icon} size={22} color={theme.primary} />}
      <Text style={[styles.actionText, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    iconTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    sub: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    qrWrap: { alignItems: 'center', marginTop: spacing.lg },
    qrBox: { backgroundColor: '#FFFFFF', padding: spacing.sm, borderRadius: radius.md },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md },
    timer: { fontSize: font.sm, fontWeight: '800' },
    note: { fontSize: font.sm, color: t.textMuted, textAlign: 'center', marginTop: spacing.xs },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.md },
    actionText: { fontSize: font.sm, fontWeight: '800' },
  });
