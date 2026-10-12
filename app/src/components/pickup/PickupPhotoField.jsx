import { useImperativeHandle, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { useTheme } from '../../context/ThemeContext';
import { showError } from '../../lib/notify';
import { font, radius, spacing } from '../../theme';

// Optional LIVE photo of the person collecting the student — camera only (no
// gallery). The shot is re-rendered at 480px / JPEG 0.6 through view-shot so the
// upload stays a few tens of KB whatever the phone's camera resolution is.
// Parent calls `ref.current.capture()` → data URI, or null when no photo was taken.
export default function PickupPhotoField({ ref, disabled = false, label = 'Photo of the person collecting' }) {
  const theme = useTheme();
  const [uri, setUri] = useState(null);
  const shot = useRef(null);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      if (!uri) return null;
      return captureRef(shot, { format: 'jpg', quality: 0.6, result: 'data-uri', width: 480, height: 480 });
    },
    reset: () => setUri(null),
  }));

  const take = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showError({ message: 'Camera permission is needed to take the photo.' }, 'Camera');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (!res.canceled && res.assets?.[0]?.uri) setUri(res.assets[0].uri);
    } catch (e) {
      showError({ message: String(e?.message || 'Could not open the camera.') }, 'Camera');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label} (optional)</Text>
      <View style={styles.row}>
        <View ref={shot} collapsable={false} style={[styles.box, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
          {uri ? <Image source={{ uri }} style={styles.img} /> : <Ionicons name="person-circle-outline" size={44} color={theme.textMuted} />}
        </View>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Pressable
            disabled={disabled}
            onPress={take}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btn, { backgroundColor: theme.primary }, (disabled || pressed) && { opacity: 0.7 }]}
          >
            <Ionicons name="camera" size={18} color={theme.onPrimary} />
            <Text style={[styles.btnText, { color: theme.onPrimary }]}>{uri ? 'Retake photo' : 'Take photo'}</Text>
          </Pressable>
          {uri ? (
            <Pressable disabled={disabled} onPress={() => setUri(null)} accessibilityRole="button" style={styles.remove}>
              <Text style={{ color: theme.danger, fontWeight: '700', fontSize: font.sm }}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: font.md, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: { width: 96, height: 96, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 10, borderRadius: radius.md },
  btnText: { fontWeight: '800', fontSize: font.md },
  remove: { alignItems: 'center', paddingVertical: 4 },
});
