import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { Badge, EmptyState, ErrorView, SearchBar, Segmented, SectionTitle } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonCards } from '../../../components/Skeleton';
import { BarList, TrendBars } from '../../../components/principal/monitoring/Charts';
import { inr, Panel, StatGrid } from '../../../components/principal/monitoring/Common';
import { font, spacing } from '../../../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'dues', label: 'Dues roster' },
];
const PAGE = 40;

function parseAmount(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const n = Number(String(str).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Report dates arrive as "DD/MM/YYYY" (en-IN).
function parseInDate(str) {
  if (!str || str === 'N/A') return null;
  const m = String(str).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

async function loadFees() {
  const [summary, fees, dues] = await Promise.all([
    api.feeSummary(),
    api.feeReport('fees', { limit: 500 }).catch(() => ({ data: [] })),
    api.feeReport('fee_dues', { limit: 500 }).catch(() => ({ data: [] })),
  ]);
  return { summary: summary || null, payments: fees?.data || [], dues: dues?.data || [], duesStats: dues?.stats || null };
}

export default function FeeMonitoring() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(loadFees, [], { refetchOnFocus: true, cacheKey: 'principal.fees' });
  const [tab, setTab] = useState('overview');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);

  const { summary, payments, dues, duesStats } = state.data || { payments: [], dues: [] };
  const totalCollected = summary?.totalCollected ?? 0;
  const totalOutstanding = duesStats?.totalDue ?? summary?.totalDue ?? 0;
  const rate = totalCollected + totalOutstanding > 0 ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100) : 0;

  const monthly = useMemo(() => {
    const buckets = new Map();
    payments.forEach((p) => {
      const d = parseInDate(p['Payment Date']);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, (buckets.get(key) || 0) + parseAmount(p['Amount Paid']));
    });
    return Array.from(buckets.entries())
      .sort((a, b) => {
        const [ay, am] = a[0].split('-').map(Number);
        const [by, bm] = b[0].split('-').map(Number);
        return ay - by || am - bm;
      })
      .slice(-8)
      .map(([key, amount]) => {
        const [y, m] = key.split('-').map(Number);
        return { label: `${MONTHS[m]} ${String(y).slice(2)}`, value: amount };
      });
  }, [payments]);

  const byClass = useMemo(() => {
    const buckets = new Map();
    dues.forEach((d) => {
      const cls = (!d.Class || d.Class === '—' ? 'Unknown' : d.Class).split(' - ')[0] || 'Unknown';
      buckets.set(cls, (buckets.get(cls) || 0) + parseAmount(d['Pending Due']));
    });
    return Array.from(buckets.entries())
      .map(([label, value]) => ({ label, value, text: inr(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dues]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = dues.map((d, i) => ({
      id: `${d['Invoice No'] || i}-${i}`,
      invoiceNo: d['Invoice No'],
      name: d['Student Name'],
      cls: d.Class,
      phone: d['Parent Phone'],
      total: parseAmount(d['Total Fee']),
      paid: parseAmount(d['Paid Amount']),
      pending: parseAmount(d['Pending Due']),
      dueDate: d['Due Date'],
      status: d.Status,
    }));
    return term ? all.filter((r) => [r.name, r.cls, r.invoiceNo].some((v) => String(v || '').toLowerCase().includes(term))) : all;
  }, [dues, q]);

  const loadingFirst = state.loading && !state.data;

  return (
    <RefreshableScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }} onRefresh={() => state.reload({ silent: true })}>
      <Stack.Screen options={{ title: 'Fees' }} />
      {state.error && !state.data ? (
        <ErrorView error={state.error} onRetry={state.reload} />
      ) : loadingFirst ? (
        <SkeletonCards padded={false} />
      ) : (
        <>
          <StatGrid
            items={[
              { label: 'Fee collected', value: inr(totalCollected), icon: 'cash-outline', color: theme.success },
              { label: 'Outstanding', value: inr(totalOutstanding), icon: 'alert-circle-outline', color: theme.danger },
              { label: 'Collection rate', value: `${rate}%`, icon: 'pie-chart-outline' },
              { label: 'Defaulter invoices', value: duesStats?.defaultersCount ?? dues.length, icon: 'people-outline', color: theme.warning },
            ]}
          />
          <Segmented options={TABS} value={tab} onChange={setTab} />
          <View style={{ height: spacing.lg }} />
          {tab === 'overview' ? (
            <>
              <Panel title="Monthly tuition revenue">
                {monthly.length ? (
                  <TrendBars data={monthly} color={theme.success} format={inr} />
                ) : (
                  <Text style={styles.muted}>No payments recorded yet.</Text>
                )}
              </Panel>
              <Panel title="Outstanding dues by class">
                {byClass.length ? <BarList data={byClass} color={theme.danger} /> : <Text style={styles.muted}>No outstanding dues.</Text>}
              </Panel>
            </>
          ) : (
            <>
              <SectionTitle title={`Deficit accounts${duesStats?.defaultersCount ? ` (${duesStats.defaultersCount})` : ''}`} />
              <SearchBar
                value={q}
                onChangeText={(v) => {
                  setQ(v);
                  setShown(PAGE);
                }}
                placeholder="Search student, class or invoice"
                style={{ marginBottom: spacing.md }}
              />
              {rows.length === 0 ? (
                <EmptyState icon="happy-outline" title="No outstanding fee dues" />
              ) : (
                <>
                  {rows.slice(0, shown).map((r) => (
                    <View key={r.id} style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.title} numberOfLines={1}>{r.name}</Text>
                        <Badge label={r.status || 'PENDING'} tone={r.status === 'OVERDUE' ? 'danger' : 'warning'} />
                      </View>
                      <Text style={styles.muted}>{r.cls} · Invoice {r.invoiceNo}</Text>
                      <View style={styles.row}>
                        <Text style={styles.muted}>Due {r.dueDate}</Text>
                        <Text style={styles.due}>{inr(r.pending)}</Text>
                      </View>
                      <Text style={styles.muted}>
                        Total {inr(r.total)} · Paid {inr(r.paid)}
                      </Text>
                      {r.phone && r.phone !== '—' ? <Text style={styles.muted}>Parent: {r.phone}</Text> : null}
                    </View>
                  ))}
                  {rows.length > shown ? <Button title={`Show more (${rows.length - shown})`} variant="outline" onPress={() => setShown((n) => n + PAGE)} /> : null}
                </>
              )}
            </>
          )}
        </>
      )}
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.md, gap: 4 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.lg, fontWeight: '800' },
    muted: { color: t.textMuted, fontSize: font.md },
    due: { color: t.danger, fontSize: font.lg, fontWeight: '800' },
  });
