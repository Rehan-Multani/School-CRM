import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { usePortal } from '../../../context/PortalScope';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { fmtDate } from '../../../lib/format';
import { EmptyState } from '../../../components/kit';
import PagedList from '../../../components/PagedList';
import { money } from '../../../components/student/status';
import { font, radius, spacing } from '../../../theme';

// Doc 03 §7.4 — every completed payment for the selected child, newest first.
export default function Receipts() {
  const { api, base, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <PagedList
      deps={[scopeKey]}
      cacheKey="parent.receipts"
      fetchPage={(page) => api.receipts({ page, limit: 20 })}
      contentContainerStyle={{ paddingTop: spacing.lg }}
      ListEmptyComponent={<EmptyState icon="receipt-outline" title="No receipts yet" message="Receipts appear here after a fee payment is confirmed." />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`${base}/fees/receipt/${item.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
        >
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="receipt-outline" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.invoice?.periodLabel || item.invoice?.invoiceNumber || 'Fee payment'}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {fmtDate(item.paymentDate)} · {String(item.paymentMethod || '').replace(/_/g, ' ')} · {item.receiptNumber || '—'}
            </Text>
          </View>
          <Text style={[styles.amount, { color: theme.success }]}>{money(item.amount)}</Text>
        </Pressable>
      )}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, padding: spacing.md, marginBottom: spacing.sm },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.md, fontWeight: '700', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    amount: { fontSize: font.lg, fontWeight: '800' },
  });
