import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { newIdempotencyKey } from '../../../api/student';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { errorText, fmtBytes, fmtDate, fmtDateTime } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { showError, toast } from '../../../lib/notify';
import { Button, Card } from '../../../components/ui';
import { AsyncView, Badge, FieldLabel, ListRow, ProgressBar, SectionTitle, TextArea } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import { homeworkBadge } from '../../../components/student/status';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';

// Doc §6.3 — multipart `file` + `remarks`, pdf/doc/docx/ppt/pptx/png/jpg,
// max 10 MB; the server re-checks the real bytes.
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
const PICKER_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
];
const BLOCKING_CODES = new Set(['SUBMISSION_WINDOW_CLOSED', 'HOMEWORK_NOT_SUBMITTABLE', 'ALREADY_SUBMITTED']);

/** Why submitting is not possible right now, or null. */
function blockedReason(hw) {
  if (hw.status === 'CLOSED') return 'Submissions for this homework are closed.';
  if (hw.submission?.status === 'GRADED') return 'Your teacher has graded this homework.';
  return null;
}

function SubmitBox({ hw, onDone }) {
  const { api } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [file, setFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  // One key per submit attempt, reused on retry so a flaky network can't
  // double-submit; a new file/remark starts a new attempt.
  const keyRef = useRef(null);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const extension = String(a.name || '').split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(extension)) return setError('Allowed: PDF, Word, PowerPoint, PNG, JPG');
    if (a.size && a.size > MAX_BYTES) return setError('File is larger than 10 MB');
    setError(null);
    keyRef.current = null;
    setFile(a);
    return undefined;
  };

  const submit = async () => {
    if (!file && !remarks.trim()) {
      setError('Attach a file or write remarks');
      return;
    }
    setError(null);
    const fd = new FormData();
    if (file) fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
    fd.append('remarks', remarks.trim());
    keyRef.current = keyRef.current || newIdempotencyKey();
    setProgress(0);
    try {
      await api.submitHomework(hw.id, fd, { key: keyRef.current, onProgress: setProgress });
      keyRef.current = null;
      setFile(null);
      setRemarks('');
      toast(hw.submission ? 'Submission updated' : 'Homework submitted');
      onDone();
    } catch (err) {
      if (BLOCKING_CODES.has(err.code)) onDone();
      if (err.code === 'UPLOAD_REJECTED') setError('This file type is not allowed');
      else showError(err, 'Could not submit');
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const late = hw.dueDate && new Date(hw.dueDate) < new Date();

  return (
    <Card>
      <FieldLabel>{hw.submission ? 'Resubmit (replaces your earlier submission)' : 'Your submission'}</FieldLabel>
      <Pressable onPress={pick} disabled={busy} style={[styles.drop, { borderColor: error ? theme.danger : theme.border }]}>
        <Ionicons name={file ? 'document-attach' : 'cloud-upload-outline'} size={24} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dropTitle} numberOfLines={1}>
            {file ? file.name : 'Choose a file'}
          </Text>
          <Text style={styles.muted}>{file ? fmtBytes(file.size) : 'PDF, Word, PowerPoint, PNG, JPG · max 10 MB'}</Text>
        </View>
        {file && !busy ? (
          <Pressable onPress={() => setFile(null)} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>
      <TextArea
        label="Remarks (optional)"
        value={remarks}
        onChangeText={(v) => {
          keyRef.current = null;
          setRemarks(v);
        }}
        maxLength={1000}
        placeholder="Anything your teacher should know"
        editable={!busy}
      />
      {error ? <Text style={[styles.muted, { color: theme.danger, marginBottom: spacing.md }]}>{error}</Text> : null}
      {late ? <Text style={[styles.muted, { color: theme.warning, marginBottom: spacing.md }]}>The due date has passed — this will be marked late.</Text> : null}
      {busy ? (
        <View style={{ marginBottom: spacing.md, gap: 6 }}>
          <ProgressBar value={progress} />
          <Text style={styles.muted}>Uploading… {Math.round(progress * 100)}%</Text>
        </View>
      ) : null}
      <Button title={hw.submission ? 'Resubmit' : 'Submit'} icon="paper-plane-outline" loading={busy} loadingTitle={hw.submission ? 'Resubmitting...' : 'Submitting...'} onPress={submit} />
    </Card>
  );
}

export default function HomeworkDetail() {
  const { api, scopeKey, readOnly } = usePortal();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.homework(id), [id, scopeKey]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RefreshableScroll
        onRefresh={() => state.reload({ silent: true })}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
          {(hw) => {
            const b = homeworkBadge(hw);
            const blocked = blockedReason(hw);
            const sub = hw.submission;
            return (
              <>
                <Card>
                  <View style={styles.row}>
                    <Text style={styles.subject}>{hw.subjectName || 'General'}</Text>
                    <Badge label={b.label} tone={b.tone} />
                  </View>
                  <Text style={styles.title}>{hw.title}</Text>
                  <Text style={styles.muted}>
                    Assigned {fmtDate(hw.assignedDate)} · Due {fmtDate(hw.dueDate)}
                    {hw.teacherName ? `\n${hw.teacherName}` : ''}
                  </Text>
                  {hw.description ? <Text style={styles.body}>{hw.description}</Text> : null}
                </Card>

                {hw.attachments?.length ? (
                  <>
                    <SectionTitle title="Attachments" />
                    <Card style={{ paddingVertical: 0 }}>
                      {hw.attachments.map((a, i) => (
                        <ListRow key={`${a.url}-${i}`} icon="document-outline" title={a.name || `Attachment ${i + 1}`} onPress={() => openLink(a.url)} />
                      ))}
                    </Card>
                  </>
                ) : null}

                {sub ? (
                  <>
                    <SectionTitle title={readOnly ? 'Submission' : 'My submission'} />
                    <Card>
                      <Text style={styles.muted}>
                        {String(sub.status).replace(/_/g, ' ')} · {fmtDateTime(sub.submittedAt)}
                      </Text>
                      {sub.marksObtained != null ? <Text style={[styles.title, { color: theme.success }]}>Marks: {sub.marksObtained}</Text> : null}
                      {sub.remarks ? <Text style={styles.body}>{sub.remarks}</Text> : null}
                      {(sub.attachments || []).map((a, i) => (
                        <ListRow key={`${a.url}-${i}`} icon="attach" title={a.name || 'My file'} onPress={() => openLink(a.url)} />
                      ))}
                    </Card>
                  </>
                ) : null}

                {/* A parent can look but not submit (doc 03 §7.2). */}
                {readOnly ? (
                  sub ? null : (
                    <Card style={[styles.row, { justifyContent: 'flex-start', marginTop: spacing.xl }]}>
                      <Ionicons name="time-outline" size={18} color={theme.textMuted} />
                      <Text style={[styles.muted, { flex: 1 }]}>Not submitted yet.</Text>
                    </Card>
                  )
                ) : (
                <View style={{ marginTop: spacing.xl }}>
                  {blocked ? (
                    <Card style={[styles.row, { justifyContent: 'flex-start' }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
                      <Text style={[styles.muted, { flex: 1 }]}>{blocked}</Text>
                    </Card>
                  ) : (
                    <SubmitBox hw={hw} onDone={() => state.reload({ silent: true })} />
                  )}
                </View>
                )}
                {state.error ? <Text style={[styles.muted, { color: theme.danger, marginTop: spacing.md }]}>{errorText(state.error)}</Text> : null}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    subject: { fontSize: font.sm, fontWeight: '800', color: t.primary, flex: 1 },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: 4 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    body: { fontSize: font.lg, color: t.text, marginTop: spacing.md, lineHeight: 23 },
    drop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, backgroundColor: t.surfaceAlt },
    dropTitle: { fontSize: font.md, fontWeight: '700', color: t.text },
  });
