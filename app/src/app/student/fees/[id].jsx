import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import { INVOICE_TONE, money } from '../../../components/student/status';
import RefreshableScroll from '../../../components/RefreshableScroll';
import PayNow from '../../../components/parent/PayNow';
import { font, spacing } from '../../../theme';

function Line({ label, value, strong, color, styles }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.lineValue, strong && { fontWeight: '800' }, color && { color }]}>{value}</Text>
    </View>
  );
}

// Heads, discounts, totals and the payments recorded against it. View only for
// a student; in the Parent app (`canPay`) it also carries Pay Now and receipts.
export default function InvoiceDetail() {
  const { api, scopeKey, canPay, base } = usePortal();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.invoice(id), [id, scopeKey], { cacheKey: 'fees.invoice' });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {(inv) => (
          <>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{inv.periodLabel || inv.invoiceNumber}</Text>
                <Badge label={String(inv.status).replace(/_/g, ' ')} tone={INVOICE_TONE[inv.status] || 'muted'} />
              </View>
              <Text style={styles.muted}>
                {inv.invoiceNumber} · Due {fmtDate(inv.dueDate)}
              </Text>
              {inv.periodStart ? (
                <Text style={styles.muted}>
                  Period {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                </Text>
              ) : null}
            </Card>

            <SectionTitle title="Fee heads" />
            <Card>
              {(inv.items || []).map((it, i) => (
                <View key={`${it.feeHeadName}-${i}`} style={{ marginBottom: spacing.sm }}>
                  <Line styles={styles} label={it.feeHeadName} value={money(it.finalAmount)} />
                  {it.discountAmount ? <Text style={styles.muted}>Discount {money(it.discountAmount)} on {money(it.originalAmount)}</Text> : null}
                </View>
              ))}
              <View style={styles.divider} />
              <Line styles={styles} label="Total" value={money(inv.totalAmount)} strong />
              <Line styles={styles} label="Paid" value={money(inv.paidAmount)} color={theme.success} />
              <Line styles={styles} label="Balance" value={money(inv.balanceAmount)} strong color={inv.balanceAmount ? theme.danger : theme.success} />
              {inv.notes ? <Text style={[styles.muted, { marginTop: spacing.md }]}>{inv.notes}</Text> : null}
            </Card>

            <SectionTitle title="Payments" />
            <Card>
              {inv.payments?.length ? (
                inv.payments.map((p) => (
                  <Pressable
                    key={p.id}
                    disabled={!canPay || p.status !== 'COMPLETED'}
                    onPress={() => router.push(`${base}/fees/receipt/${p.id}`)}
                    style={({ pressed }) => [styles.payment, pressed && { opacity: 0.7 }]}
                  >
                    <Line styles={styles} label={fmtDate(p.paymentDate)} value={money(p.amount)} strong />
                    <Text style={styles.muted}>
                      {String(p.paymentMethod || '').replace(/_/g, ' ')} · Receipt {p.receiptNumber} · {p.status}
                      {canPay && p.status === 'COMPLETED' ? ' · View receipt ›' : ''}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.muted}>No payments recorded yet.</Text>
              )}
            </Card>
            {canPay ? (
              <PayNow invoice={inv} onChanged={() => state.reload({ silent: true })} />
            ) : (
              <Text style={[styles.muted, { marginTop: spacing.lg, textAlign: 'center' }]}>Ask your parent to pay from the Parent app.</Text>
            )}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: spacing.md },
    lineLabel: { flex: 1, fontSize: font.md, color: t.text },
    lineValue: { fontSize: font.md, color: t.text },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: spacing.sm },
    payment: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  });
