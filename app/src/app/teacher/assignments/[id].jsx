import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { errorText, fmtDate, fmtDateTime } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { confirm, showError, toast } from '../../../lib/notify';
import { Button, Card, Input } from '../../../components/ui';
import { AsyncView, Badge, ListRow, SectionTitle, StatusBadge, TextArea } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';
import { SkeletonDetail } from '../../../components/Skeleton';

const SUB_TONE = { SUBMITTED: 'primary', LATE: 'warning', GRADED: 'success', PENDING: 'muted' };

// Doc §6.5 — Grade bottom sheet (marksObtained 0..maxMarks, feedback).
function GradeSheet({ assignment, row, onClose, onSaved }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [marks, setMarks] = useState(row?.marksObtained != null ? String(row.marksObtained) : '');
  const [feedback, setFeedback] = useState(row?.feedback || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(marks);
    if (marks === '' || !Number.isFinite(n) || n < 0 || n > assignment.maxMarks) {
      setError(`Enter marks between 0 and ${assignment.maxMarks}`);
      return;
    }
    setSaving(true);
    try {
      await teacherApi.gradeSubmission(assignment.id, row.submissionId, { marksObtained: n, feedback: feedback.trim() });
      toast('Graded');
      onSaved();
    } catch (e) {
      // Inline, not a toast: the toast layer sits behind this native Modal.
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding">
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg }}>
          <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>Grade · {row.studentName}</Text>
          <Text style={{ color: theme.textMuted, marginBottom: spacing.lg }}>Out of {assignment.maxMarks}</Text>
          <Input
            label="Marks obtained"
            value={marks}
            onChangeText={(v) => {
              setError('');
              setMarks(v.replace(/[^\d.]/g, ''));
            }}
            keyboardType="decimal-pad"
            maxLength={6}
            error={error}
            placeholder={`0 - ${assignment.maxMarks}`}
          />
          <TextArea label="Feedback (optional)" value={feedback} onChangeText={setFeedback} maxLength={2000} placeholder="Comments for the student" />
          <Button title="Save grade" icon="checkmark" loading={saving} loadingTitle="Saving grade..." onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AssignmentDetail() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [grading, setGrading] = useState(null);
  const [busy, setBusy] = useState(false);
  const state = useAsync(
    async () => {
      const [a, subs] = await Promise.all([teacherApi.assignment(id), teacherApi.assignmentSubmissions(id)]);
      return { a, subs };
    },
    [id],
    { refetchOnFocus: true },
  );

  const remove = async (a) => {
    const ok = await confirm('Delete assignment?', `"${a.title}" and all its submissions will be deleted.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await teacherApi.deleteAssignment(a.id);
      toast('Assignment deleted');
      router.back();
    } catch (e) {
      showError(e);
      setBusy(false);
    }
  };

  return (
    <>
      <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
        <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
          {({ a, subs }) => (
            <>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.title}>{a.title}</Text>
                  <StatusBadge status={a.status} />
                </View>
                <Text style={styles.muted}>
                  {a.subjectName} · {a.className}-{a.sectionName} · Max {a.maxMarks}
                </Text>
                <Text style={styles.muted}>
                  Assigned {fmtDate(a.assignedDate)} · Due {fmtDate(a.dueDate)}
                </Text>
                {a.description ? <Text style={styles.body}>{a.description}</Text> : null}
                {a.instructions ? <Text style={[styles.body, { fontStyle: 'italic' }]}>{a.instructions}</Text> : null}
                {(a.attachments || []).map((x, i) => (
                  <Text key={`${x.url}-${i}`} style={[styles.link, { color: theme.primary }]} onPress={() => openLink(x.url)}>
                    🔗 {x.name || x.url}
                  </Text>
                ))}
              </Card>
              <View style={styles.actions}>
                <Button title="Edit" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/teacher/assignments/form', params: { id: a.id } })} />
                <Button title="Delete" icon="trash-outline" variant="secondary" style={{ flex: 1 }} loading={busy} loadingTitle="Deleting..." onPress={() => remove(a)} />
              </View>

              <SectionTitle
                title="Submissions"
                right={
                  <Text style={styles.muted}>
                    {subs.summary.submitted} submitted · {subs.summary.graded} graded
                  </Text>
                }
              />
              <Card style={{ paddingVertical: 0 }}>
                {subs.submissions.map((s) => (
                  <ListRow
                    key={s.studentId}
                    title={`${s.rollNumber ? `${s.rollNumber}. ` : ''}${s.studentName}`}
                    subtitle={
                      s.status === 'GRADED'
                        ? `${s.marksObtained}/${a.maxMarks}${s.feedback ? ` · ${s.feedback}` : ''}`
                        : s.submittedAt
                          ? `Submitted ${fmtDateTime(s.submittedAt)} · tap to grade`
                          : 'Not submitted'
                    }
                    right={<Badge label={s.status} tone={SUB_TONE[s.status] || 'muted'} />}
                    onPress={s.submissionId ? () => setGrading(s) : undefined}
                  />
                ))}
                {!subs.submissions.length ? <Text style={[styles.muted, { paddingVertical: spacing.lg }]}>No students in this section.</Text> : null}
              </Card>
              {grading ? (
                <GradeSheet
                  assignment={a}
                  row={grading}
                  onClose={() => setGrading(null)}
                  onSaved={() => {
                    setGrading(null);
                    state.reload({ silent: true });
                  }}
                />
              ) : null}
            </>
          )}
        </AsyncView>
      </RefreshableScroll>
    </>
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
