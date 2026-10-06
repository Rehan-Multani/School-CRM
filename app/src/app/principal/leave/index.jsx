import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { fmtDate } from '../../../lib/format';
import { confirm, showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState, SearchBar, StatusBadge } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonCards } from '../../../components/Skeleton';
import RejectModal from '../../../components/principal/monitoring/RejectModal';
import { LEAVE_TYPES, leaveTypeLabel } from '../../../components/principal/monitoring/leaveUtils';
import { font, spacing } from '../../../theme';

const LIMIT = 20;
const STATUSES = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function LeaveApproval() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const list = useRef(null);
  const [status, setStatus] = useState('PENDING');
  const [type, setType] = useState('ALL');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 400);
    return () => clearTimeout(id);
  }, [q]);

  const fetchPage = async (page) => {
    const r = await api.leaves({
      page,
      limit: LIMIT,
      search,
      status: status === 'ALL' ? undefined : status,
      leaveType: type === 'ALL' ? undefined : type,
    });
    if (r?.stats) setStats(r.stats);
    return { data: r?.data || [], pagination: { page: r?.page || page, totalPages: Math.max(1, Math.ceil((r?.total || 0) / (r?.limit || LIMIT))) } };
  };

  const patch = (id, changes) => list.current?.update((items) => items.map((x) => (x.id === id ? { ...x, ...changes } : x)));
  // The status filter may no longer match after a decision: reload the list + counters.
  const refresh = () => list.current?.reload();

  const approve = async (l) => {
    const ok = await confirm('Approve leave?', `${l.employeeName}: ${fmtDate(l.startDate)} to ${fmtDate(l.endDate)} (${l.totalDays || 1} day${l.totalDays === 1 ? '' : 's'}). The leave quota is deducted.`, { confirmText: 'Approve' });
    if (!ok) return;
    try {
      await api.approveLeave(l.id);
      patch(l.id, { status: 'APPROVED' });
      toast('Leave approved');
      refresh();
    } catch (e) {
      showError(e);
      refresh();
    }
  };

  const reject = async (reason) => {
    try {
      await api.rejectLeave(rejecting.id, reason);
      toast('Leave rejected');
      refresh();
    } catch (e) {
      showError(e);
      refresh();
      throw e;
    }
  };

  const cancel = async (l) => {
    const ok = await confirm('Cancel leave?', `${l.employeeName}: ${fmtDate(l.startDate)} to ${fmtDate(l.endDate)}`, { confirmText: 'Cancel leave', destructive: true });
    if (!ok) return;
    try {
      await api.cancelLeave(l.id);
      patch(l.id, { status: 'CANCELLED' });
      toast('Leave cancelled');
      refresh();
    } catch (e) {
      showError(e);
      refresh();
    }
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
      {stats ? (
        <Text style={styles.summary}>
          Total {stats.TOTAL ?? 0} · Pending {stats.PENDING ?? 0} · Approved {stats.APPROVED ?? 0} · Rejected/cancelled {(stats.REJECTED || 0) + (stats.CANCELLED || 0)}
        </Text>
      ) : null}
      <SearchBar value={q} onChangeText={setQ} placeholder="Search name, employee ID or department" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUSES.map((s) => (
          <Chip key={s.value} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip label="All types" active={type === 'ALL'} onPress={() => setType('ALL')} />
        {LEAVE_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} active={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Leave approval' }} />
      {header}
      <PagedList
        ref={list}
        skeleton={<SkeletonCards padded={false} />}
        deps={[search, status, type]}
        fetchPage={fetchPage}
        contentContainerStyle={{ paddingTop: spacing.md }}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No leave requests" message="Nothing matches the current filters." />}
        renderItem={({ item: l }) => {
          const open = expanded[l.id];
          const isStudent = l.employeeType === 'STUDENT';
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{l.employeeName}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {[l.employeeId, isStudent ? [l.className, l.sectionName].filter(Boolean).join(' ') : l.department || 'General'].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <StatusBadge status={l.status} />
              </View>
              <View style={styles.chips}>
                <Badge label={leaveTypeLabel(l.leaveType)} tone="primary" />
                <Badge label={`${l.totalDays || 1} day${l.totalDays === 1 ? '' : 's'}`} tone="muted" />
                {l.employeeType ? <Badge label={l.employeeType} tone="info" /> : null}
              </View>
              <Text style={styles.muted}>
                {fmtDate(l.startDate)} to {fmtDate(l.endDate)} · Applied {fmtDate(l.createdAt)}
              </Text>
              <Pressable onPress={() => setExpanded((e) => ({ ...e, [l.id]: !e[l.id] }))}>
                <Text style={styles.reason} numberOfLines={open ? undefined : 3}>{l.reason || 'Personal reasons'}</Text>
              </Pressable>
              {l.status === 'REJECTED' && l.rejectionReason ? (
                <Text style={[styles.muted, { color: theme.danger }]}>Rejected{l.rejectedBy ? ` by ${l.rejectedBy}` : ''}: {l.rejectionReason}</Text>
              ) : null}
              {l.status === 'APPROVED' && l.approvedBy ? <Text style={styles.muted}>Approved by {l.approvedBy}</Text> : null}
              {l.documentUrl ? (
                <View style={styles.line}>
                  <Ionicons name="document-attach-outline" size={15} color={theme.textMuted} />
                  <Text style={styles.muted}>Supporting document attached</Text>
                </View>
              ) : null}
              {l.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <Button title="Approve" onPress={() => approve(l)} style={{ flex: 1 }} />
                  <Button title="Reject" variant="danger" onPress={() => setRejecting(l)} style={{ flex: 1 }} />
                </View>
              ) : null}
              {l.status === 'PENDING' || l.status === 'APPROVED' ? (
                <Button title="Cancel request" variant="ghost" onPress={() => cancel(l)} />
              ) : null}
            </View>
          );
        }}
      />
      <Pressable style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => router.push('/principal/leave/apply')} accessibilityRole="button" accessibilityLabel="Apply for leave on behalf of staff">
        <Ionicons name="add" size={28} color={theme.onPrimary} />
      </Pressable>
      <RejectModal visible={Boolean(rejecting)} onClose={() => setRejecting(null)} onSubmit={reject} />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.md, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { color: t.text, fontSize: font.lg, fontWeight: '800' },
    muted: { color: t.textMuted, fontSize: font.md },
    reason: { color: t.text, fontSize: font.md, lineHeight: 20 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    summary: { color: t.textMuted, fontSize: font.sm, fontWeight: '700' },
    chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  });
