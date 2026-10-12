import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui';
import { font, radius, spacing } from '../../theme';

// expo-camera is a native module: a build made before it was added must not
// crash on import, so it is loaded defensively.
let Camera = null;
try {
  Camera = require('expo-camera');
} catch {
  Camera = null;
}

function Scanner({ onToken, onClose, busy, error }) {
  const theme = useTheme();
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const lock = useRef(false);
  // The camera keeps seeing the same code while the error is on screen. A QR that
  // was just submitted is ignored for a while, so one bad QR is one request, not
  // one every few seconds (the server allows 20/min per IP, shared by every
  // teacher on the school network).
  const last = useRef({ data: null, at: 0 });
  // Measured size of the camera area: the frame is centred from this, not left to flex.
  const [box, setBox] = useState({ w: 0, h: 0 });

  const frameSize = Math.max(220, Math.min(320, Math.round(Math.min(box.w || 300, box.h || 300) * 0.7)));

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color="#fff" />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color="#fff" />
        <Text style={styles.msg}>Camera access is needed to scan the parent&apos;s pickup QR.</Text>
        {permission.canAskAgain === false ? (
          <>
            <Text style={styles.msg}>Camera access was turned off. Enable it in the phone settings, then come back.</Text>
            <Button title="Open settings" onPress={() => Linking.openSettings().catch(() => {})} style={{ alignSelf: 'stretch', marginTop: spacing.lg }} />
          </>
        ) : (
          <Button title="Allow camera" onPress={requestPermission} style={{ alignSelf: 'stretch', marginTop: spacing.lg }} />
        )}
        <Button title="Close" variant="ghost" onPress={onClose} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Camera.CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          busy
            ? undefined
            : ({ data }) => {
                if (lock.current) return;
                const token = String(data || '');
                if (!token) return;
                if (last.current.data === token && Date.now() - last.current.at < 10000) return;
                last.current = { data: token, at: Date.now() };
                lock.current = true;
                Promise.resolve(onToken(token)).catch(() => {}).finally(() => {
                  setTimeout(() => {
                    lock.current = false;
                  }, 2500);
                });
              }
        }
      />
      {box.w > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View
            style={[
              styles.frame,
              {
                width: frameSize,
                height: frameSize,
                left: (box.w - frameSize) / 2,
                top: (box.h - frameSize) / 2,
                borderColor: error && !busy ? theme.danger || '#DC2626' : theme.primary,
              },
            ]}
          />
          <Text style={[styles.hint, { top: (box.h + frameSize) / 2 + spacing.md }]}>
            {busy ? 'Verifying…' : "Point the camera at the parent's pickup QR"}
          </Text>
        </View>
      ) : null}
      {error && !busy ? (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>QR not accepted</Text>
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Full-screen QR scanner. `onToken(token)` may return a promise; further scans
// are ignored until it settles (+1.5s) so one QR is never submitted twice.
export default function QrScannerModal({ visible, onToken, onClose, busy = false, error = '', title = 'Scan pickup QR' }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close scanner">
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
        {!Camera ? (
          <View style={styles.center}>
            <Text style={styles.msg}>QR scanning needs the latest version of the app. Please update the app.</Text>
          </View>
        ) : (
          <Scanner onToken={onToken} onClose={onClose} busy={busy} error={error} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { color: '#fff', fontSize: font.lg, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  msg: { color: '#fff', fontSize: font.md, textAlign: 'center', marginTop: spacing.md },
  frame: { position: 'absolute', borderWidth: 3, borderRadius: radius.lg },
  errorBox: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl * 2, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#B91C1C', borderRadius: radius.lg, padding: spacing.md },
  errorTitle: { color: '#fff', fontSize: font.md, fontWeight: '800' },
  errorMsg: { color: '#fff', fontSize: font.sm, marginTop: 2 },
  hint: { position: 'absolute', left: 0, right: 0, color: '#fff', fontSize: font.sm, fontWeight: '700', textAlign: 'center', paddingHorizontal: spacing.lg },
});
