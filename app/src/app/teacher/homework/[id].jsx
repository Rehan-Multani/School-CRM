import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate, fmtDateTime } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button, Card } from '../../../components/ui';
import { AsyncView, Badge, ListRow, SectionTitle, StatusBadge } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonDetail } from '../../../components/Skeleton';

const SUB_TONE = { SUBMITTED: 'primary', LATE: 'warning', GRADED: 'success', PENDING: 'muted' };

// Homework detail + who has submitted (roster left-joined with submissions).
export default function HomeworkDetail() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [busy, setBusy] = useState(null);
  const state = useAsync(
    async () => {
      const [hw, subs] = await Promise.all([teacherApi.homework(id), teacherApi.homeworkSubmissions(id)]);
      return { hw, subs };
    },
    [id],
    { refetchOnFocus: true },
  );

  const toggleClosed = async (hw) => {
    const next = hw.status === 'CLOSED' ? 'ASSIGNED' : 'CLOSED';
    setBusy('status');
    try {
      await teacherApi.updateHomework(hw.id, { status: next });
      toast(next === 'CLOSED' ? 'Homework closed' : 'Homework reopened');
      await state.reload({ silent: true });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (hw) => {
    const ok = await confirm('Delete homework?', `"${hw.title}" and all its submissions will be deleted.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    setBusy('delete');
    try {
      await teacherApi.deleteHomework(hw.id);
      toast('Homework deleted');
      router.back();
    } catch (e) {
      showError(e);
      setBusy(null);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {({ hw, subs }) => (
          <>
            <Card>
              <View style={styles.row}>
                <Text style={styles.title}>{hw.title}</Text>
                <StatusBadge status={hw.status} />
              </View>
              <Text style={styles.muted}>
                {hw.subjectName} · {hw.className}-{hw.sectionName}
              </Text>
              <Text style={styles.muted}>
                Assigned {fmtDate(hw.assignedDate)} · Due {fmtDate(hw.dueDate)}
              </Text>
              {hw.description ? <Text style={styles.body}>{hw.description}</Text> : null}
              {(hw.attachments || []).map((a, i) => (
                <Text key={`${a.url}-${i}`} style={[styles.link, { color: theme.primary }]} onPress={() => openLink(a.url)}>
                  🔗 {a.name || a.url}
                </Text>
              ))}
            </Card>

            <View style={styles.actions}>
              <Button title="Edit" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/teacher/homework/form', params: { id: hw.id } })} />
              <Button
                title={hw.status === 'CLOSED' ? 'Reopen' : 'Close'}
                icon={hw.status === 'CLOSED' ? 'lock-open-outline' : 'lock-closed-outline'}
                variant="secondary"
                style={{ flex: 1 }}
                loading={busy === 'status'}
                loadingTitle={hw.status === 'CLOSED' ? 'Reopening...' : 'Closing...'}
                disabled={Boolean(busy)}
                onPress={() => toggleClosed(hw)}
              />
              <Button title="Delete" icon="trash-outline" variant="secondary" style={{ flex: 1 }} loading={busy === 'delete'} loadingTitle="Deleting..." disabled={Boolean(busy)} onPress={() => remove(hw)} />
            </View>

            <SectionTitle
              title="Submissions"
              right={<Text style={styles.muted}>{subs.summary.submitted}/{subs.summary.total} submitted</Text>}
            />
            <Card style={{ paddingVertical: 0 }}>
              {subs.submissions.length ? (
                subs.submissions.map((s) => (
                  <ListRow
                    key={s.studentId}
                    title={`${s.rollNumber ? `${s.rollNumber}. ` : ''}${s.studentName}`}
                    subtitle={s.submittedAt ? `Submitted ${fmtDateTime(s.submittedAt)}` : 'Not submitted'}
                    right={<Badge label={s.status} tone={SUB_TONE[s.status] || 'muted'} />}
                  />
                ))
              ) : (
                <Text style={[styles.muted, { paddingVertical: spacing.lg }]}>No students in this section.</Text>
              )}
            </Card>
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
    title: { flex: 1, fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    body: { fontSize: font.md, color: t.text, marginTop: spacing.md, lineHeight: 21 },
    link: { marginTop: spacing.sm, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  });
