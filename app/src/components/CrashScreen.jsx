import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BRAND_PRIMARY as BRAND } from '../theme';

// Expo Router renders this (exported as `ErrorBoundary` from the root layout)
// when a screen throws while rendering. It sits outside every provider, so it
// uses the fixed brand colours and nothing from context. The technical message
// is only shown to developers — never to a parent or teacher.
export default function CrashScreen({ error, retry }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="alert-circle-outline" size={44} color={BRAND} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.msg}>This screen could not be shown. Please try again. If it keeps happening, close and reopen the app.</Text>
      {__DEV__ && error?.message ? <Text style={styles.dev}>{String(error.message)}</Text> : null}
      <Pressable onPress={retry} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFFFFF' },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  msg: { fontSize: 14, lineHeight: 20, color: '#475569', textAlign: 'center', marginTop: 8, maxWidth: 320 },
  dev: { fontSize: 12, color: '#B91C1C', textAlign: 'center', marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 28, borderRadius: 12, backgroundColor: BRAND, marginTop: 24 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
