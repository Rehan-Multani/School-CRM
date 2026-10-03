import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../../context/AuthContext';
import { useParent } from '../../../../context/ParentContext';
import { usePortal } from '../../../../context/PortalScope';
import { useStyles, useTheme } from '../../../../context/ThemeContext';
import { useAsync } from '../../../../lib/useAsync';
import { fmtDate } from '../../../../lib/format';
import { showError } from '../../../../lib/notify';
import { shareReceiptPdf } from '../../../../lib/receiptPdf';
import { Button, Card } from '../../../../components/ui';
import { AsyncView, SectionTitle } from '../../../../components/kit';
import { SkeletonDetail } from '../../../../components/Skeleton';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { SchoolLogo } from '../../../../components/Logos';
import { childClassLine } from '../../../../components/parent/ChildSwitcher';
import { money } from '../../../../components/student/status';
import { alpha, font, spacing } from '../../../../theme';

function Line({ label, value, strong, color, styles }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.lineValue, strong && { fontWeight: '800' }, color && { color }]}>{value}</Text>
    </View>
  );
}

// Doc 03 §7.4 — one receipt (school, receipt no., student, amount, mode, date)
// with Share / Download PDF.
export default function Receipt() {
  const { paymentId } = useLocalSearchParams();
  const { api, scopeKey } = usePortal();
  const { school, user } = useAuth();
  const { child } = useParent();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [sharing, setSharing] = useState(false);
  const state = useAsync(() => api.receipt(paymentId), [paymentId, scopeKey], { cacheKey: 'parent.receipt' });

  const share = async (receipt) => {
    setSharing(true);
    try {
      await shareReceiptPdf({ receipt, school, child, parentName: user?.name, accent: theme.primary });
    } catch {
      showError({ message: 'Could not create the PDF. Please try again.' }, 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {(r) => {
          const inv = r.invoice || {};
          return (
            <>
              <Card style={{ alignItems: 'center' }}>
                <SchoolLogo school={school} size={48} />
                <Text style={styles.school}>{school?.name}</Text>
                <Text style={styles.kicker}>FEE PAYMENT RECEIPT</Text>
                <View style={[styles.paidBox, { backgroundColor: alpha(theme.success, theme.isDark ? 0.18 : 0.1), borderColor: theme.success }]}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                  <Text style={[styles.amount, { color: theme.success }]}>{money(r.amount)}</Text>
                </View>
                <Text style={styles.muted}>Received on {fmtDate(r.paymentDate)}</Text>
              </Card>

              <SectionTitle title="Payment" />
              <Card>
                <Line styles={styles} label="Receipt no." value={r.receiptNumber || '—'} strong />
                <Line styles={styles} label="Mode" value={String(r.paymentMethod || '—').replace(/_/g, ' ')} />
                <Line styles={styles} label="Transaction id" value={r.transactionId || '—'} />
                <Line styles={styles} label="Status" value={String(r.status || '').replace(/_/g, ' ')} color={theme.success} />
              </Card>

              <SectionTitle title="Student" />
              <Card>
                <Line styles={styles} label="Name" value={child?.name || '—'} strong />
                <Line styles={styles} label="Class" value={childClassLine(child) || '—'} />
                <Line styles={styles} label="Admission no." value={child?.admissionNumber || '—'} />
              </Card>

              <SectionTitle title={inv.periodLabel || 'Invoice'} />
              <Card>
                {(inv.items || []).map((it, i) => (
                  <Line key={`${it.feeHeadName}-${i}`} styles={styles} label={it.feeHeadName} value={money(it.finalAmount)} />
                ))}
                <View style={styles.divider} />
                <Line styles={styles} label="Invoice total" value={money(inv.totalAmount)} strong />
                <Line styles={styles} label="Paid so far" value={money(inv.paidAmount)} color={theme.success} />
                <Line styles={styles} label="Balance" value={money(inv.balanceAmount)} strong color={inv.balanceAmount ? theme.danger : theme.success} />
                {inv.invoiceNumber ? <Text style={[styles.muted, { marginTop: spacing.sm }]}>Invoice {inv.invoiceNumber}</Text> : null}
              </Card>

              <Button title="Share / Download PDF" icon="share-outline" loading={sharing} loadingTitle="Preparing PDF..." onPress={() => share(r)} style={{ marginTop: spacing.xl }} />
            </>
          );
        }}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    school: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: spacing.sm, textAlign: 'center' },
    kicker: { fontSize: font.xs, fontWeight: '800', color: t.textMuted, letterSpacing: 1.2, marginTop: 2 },
    paidBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: 14, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
    amount: { fontSize: font.xxl, fontWeight: '800' },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.sm },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: spacing.md },
    lineLabel: { fontSize: font.md, color: t.textMuted },
    lineValue: { flex: 1, textAlign: 'right', fontSize: font.md, color: t.text },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: spacing.sm },
  });
