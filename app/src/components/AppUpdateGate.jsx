import { useEffect, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { api } from '../api/client';
import { onPushReceived } from '../lib/pushRouting';
import { compareVersions } from '../lib/appVersion';
import { toast } from '../lib/notify';
import { Button } from './ui';
import { brandTheme as t, font, radius, spacing } from '../theme';

const INSTALLED = Constants.expoConfig?.version || '0';
const PACKAGE = Constants.expoConfig?.android?.package || '';

// Offline / server down resolves to null: the gate keeps whatever it last knew.
const fetchConfig = () =>
  api
    .get('/app-config')
    .then((res) => res?.data || null)
    .catch(() => null);

// Where "Update" goes: the store link the Super Admin saved, else this app's
// own Play Store page.
function storeUrl(config) {
  if (Platform.OS === 'ios') return config.appStoreUrl || '';
  return config.playStoreUrl || config.apkUrl || (PACKAGE ? `https://play.google.com/store/apps/details?id=${PACKAGE}` : '');
}

// App version gate, driven by Super Admin → Settings → Mobile app
// (GET /app-config → appUpdate). Checked on launch, every time the app comes
// back to the foreground, and when the "update" push arrives.
//   installed < minVersion    → "Update required": cannot be dismissed
//   installed < latestVersion → "Update available": Later / Update
// Works signed in or out, so it uses the platform brand.
export default function AppUpdateGate() {
  const [config, setConfig] = useState(null);
  const [skipped, setSkipped] = useState(''); // the latest version the user said "Later" to

  useEffect(() => {
    const check = () => {
      fetchConfig().then((data) => {
        if (data?.appUpdate) setConfig(data);
      });
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    const offPush = onPushReceived((data) => data?.type === 'app_update' && check());
    return () => {
      sub.remove();
      offPush();
    };
  }, []);

  const { latestVersion = '', minVersion = '', message = '' } = config?.appUpdate || {};
  const required = Boolean(minVersion) && compareVersions(INSTALLED, minVersion) < 0;
  const available = Boolean(latestVersion) && compareVersions(INSTALLED, latestVersion) < 0;
  const visible = required || (available && skipped !== latestVersion);
  const target = latestVersion || minVersion;

  const update = async () => {
    const url = config ? storeUrl(config) : '';
    try {
      if (!url) throw new Error('no store link');
      await Linking.openURL(url);
    } catch {
      toast.error('Could not open the store. Please update School CRM from your app store.');
    }
  };

  return (
    // A required update leaves no way out but the store: the back button does nothing.
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => !required && setSkipped(latestVersion)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="cloud-download-outline" size={30} color={t.primary} />
          </View>
          <Text style={styles.title}>{required ? 'Update required' : 'Update available'}</Text>
          <Text style={styles.message}>
            {message ||
              (required
                ? 'This version of School CRM is no longer supported. Please update to continue.'
                : 'A new version of School CRM is available with the latest improvements.')}
          </Text>
          <Text style={styles.versions}>
            Installed {INSTALLED}
            {target ? ` · New ${target}` : ''}
          </Text>
          <Button title="Update" icon="download-outline" onPress={update} style={{ alignSelf: 'stretch' }} />
          {required ? null : (
            <Pressable onPress={() => setSkipped(latestVersion)} hitSlop={8} style={styles.later} accessibilityRole="button">
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,26,63,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    marginBottom: spacing.lg,
  },
  title: { fontSize: font.xl, fontWeight: '800', color: t.text, textAlign: 'center' },
  message: { fontSize: font.md, color: t.textMuted, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  versions: { fontSize: font.sm, color: t.textMuted, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xl },
  later: { paddingVertical: spacing.md, marginTop: spacing.xs },
  laterText: { color: t.textMuted, fontSize: font.md, fontWeight: '700' },
});
