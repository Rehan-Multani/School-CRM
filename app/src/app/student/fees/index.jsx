import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { Badge, EmptyState, ErrorView, Segmented, Stat } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { INVOICE_TONE, money } from '../../../components/student/status';
import { font, radius, spacing } from '../../../theme';

function InvoiceCard({ item }) {
  const { base } = usePortal();
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={() => router.push(`${base}/fees/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.periodLabel || item.invoiceNumber}</Text>
        <Badge label={String(item.status).replace(/_/g, ' ')} tone={INVOICE_TONE[item.status] || 'muted'} />
      </View>
      <Text style={styles.muted}>
        {item.invoiceNumber} · Due {fmtDate(item.dueDate)}
      </Text>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <Text style={styles.muted}>
          Total {money(item.totalAmount)} · Paid {money(item.paidAmount)}
        </Text>
        {item.balanceAmount ? <Text style={styles.due}>{money(item.balanceAmount)} due</Text> : null}
      </View>
    </Pressable>
  );
}

function Header({ summary, tab, setTab }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ paddingTop: spacing.md }}>
      {summary.error && !summary.data ? (
        <ErrorView error={summary.error} onRetry={summary.reload} />
      ) : summary.data ? (
        <View style={styles.stats}>
          <Stat icon="receipt-outline" label="Total" value={money(summary.data.totalFees)} />
          <Stat icon="checkmark-circle-outline" label="Paid" value={money(summary.data.paid)} color={theme.success} />
          <Stat icon="alert-circle-outline" label="Due" value={money(summary.data.pending)} color={theme.danger} />
          <Stat icon="calendar-outline" label="Next due" value={summary.data.nextDueDate ? fmtDate(summary.data.nextDueDate) : '—'} color={theme.warning} />
        </View>
      ) : (
        <SkeletonCards count={1} padded={false} />
      )}
      {/* Doc §6.7 — no Pay button here: online payment lives in the Parent app. */}
      <View style={[styles.note, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
        <Text style={[styles.noteText, { color: theme.text }]}>Ask your parent to pay from the Parent app.</Text>
      </View>
      <View style={{ marginBottom: spacing.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'invoices', label: 'Invoices' },
            { value: 'history', label: 'Payments' },
          ]}
        />
      </View>
    </View>
  );
}

export default function Fees() {
  const { api, scopeKey } = usePortal();
  const styles = useStyles(makeStyles);
  const [tab, setTab] = useState('pending');
  const summary = useAsync(() => api.feeSummary(), [scopeKey], { refetchOnFocus: true });
  const header = <Header summary={summary} tab={tab} setTab={setTab} />;

  // /fees/pending is a plain array; wrap it in the list envelope. A page-1
  // fetch is a (pull-to-)refresh, so the summary cards refresh with it.
  const fetchPage = (page) => {
    if (page === 1 && summary.data) summary.reload({ silent: true });
    if (tab === 'pending') return api.pendingFees().then((rows) => ({ data: rows || [], pagination: { page: 1, totalPages: 1 } }));
    if (tab === 'invoices') return api.invoices({ page, limit: 20 });
    return api.feeHistory({ page, limit: 20 });
  };

  return (
    <PagedList
      deps={[tab, scopeKey]}
      fetchPage={fetchPage}
      skeleton={<SkeletonCards padded={false} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon={tab === 'history' ? 'card-outline' : 'receipt-outline'}
          title={tab === 'pending' ? 'No pending fees' : tab === 'invoices' ? 'No invoices yet' : 'No payments yet'}
        />
      }
      renderItem={({ item }) =>
        tab === 'history' ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>{money(item.amount)}</Text>
              <Badge label={item.status} tone={item.status === 'COMPLETED' ? 'success' : 'muted'} />
            </View>
            <Text style={styles.muted}>
              {fmtDate(item.paymentDate)} · {String(item.paymentMethod || '').replace(/_/g, ' ')}
            </Text>
            <Text style={styles.muted}>Receipt {item.receiptNumber}</Text>
          </View>
        ) : (
          <InvoiceCard item={item} />
        )
      }
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.lg },
    noteText: { flex: 1, fontSize: font.md, fontWeight: '600' },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    due: { fontSize: font.md, fontWeight: '800', color: t.danger },
  });
