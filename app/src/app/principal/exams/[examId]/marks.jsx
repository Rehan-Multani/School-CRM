import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../../context/ThemeContext';
import { newIdempotencyKey, principalExamsApi } from '../../../../api/principal/exams';
import { useAsync } from '../../../../lib/useAsync';
import { useUnsavedGuard } from '../../../../lib/useUnsavedGuard';
import { confirm, showError, toast } from '../../../../lib/notify';
import { Button } from '../../../../components/ui';
import { Badge, EmptyState, ErrorView, Select } from '../../../../components/kit';
import { SkeletonSheet } from '../../../../components/Skeleton';
import { ATTENDANCE, rows as listOf } from '../../../../components/principal/exams/constants';
import { alpha, font, radius, spacing } from '../../../../theme';

function computeGrade(marks, max) {
  if (marks === '' || marks == null || Number.isNaN(Number(marks)) || !max) return null;
  const num = Number(marks);
  if (num < 0 || num > max) return null;
  const pct = (num / Number(max)) * 100;
  const p = Math.round(pct);
  if (pct >= 90) return { grade: 'A+', tone: 'success', pct: p };
  if (pct >= 80) return { grade: 'A', tone: 'success', pct: p };
  if (pct >= 70) return { grade: 'B', tone: 'primary', pct: p };
  if (pct >= 60) return { grade: 'C', tone: 'warning', pct: p };
  if (pct >= 50) return { grade: 'D', tone: 'warning', pct: p };
  if (pct >= 33) return { grade: 'E', tone: 'danger', pct: p };
  return { grade: 'F', tone: 'danger', pct: p };
}

// Principal marks entry: pick class / section / subject, then one card per
// student (numeric keypad, P/AB/MED/EX chips, remarks). One batched save with
// an Idempotency-Key that survives retries.
export default function MarksEntry() {
  const { examId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const exam = useAsync(() => principalExamsApi.get(examId), [examId]);
  const examSubjects = useAsync(() => principalExamsApi.subjects(examId), [examId]);
  const [classSel, setClassSel] = useState('');
  const [sectionSel, setSectionSel] = useState('');
  const [subjectSel, setSubjectSel] = useState('');
  const [sections, setSections] = useState({});

  const classes = exam.data?.data?.classes;
  const classId = classSel || classes?.[0]?.id || '';

  useEffect(() => {
    if (!classId || sections[classId]) return undefined;
    let live = true;
    principalExamsApi
      .sections(classId)
      .then((r) => live && setSections((s) => ({ ...s, [classId]: listOf(r) })))
      .catch(() => live && setSections((s) => ({ ...s, [classId]: [] })));
    return () => {
      live = false;
    };
  }, [classId, sections]);

  const classSections = sections[classId];
  const sectionId = classSections?.some((s) => s.id === sectionSel) ? sectionSel : classSections?.[0]?.id || '';
  const classSubjects = useMemo(() => listOf(examSubjects.data).filter((s) => s.classId === classId), [examSubjects.data, classId]);
  const subjectId = classSubjects.some((s) => s.subjectId === subjectSel) ? subjectSel : classSubjects[0]?.subjectId || '';

  const [rows, setRows] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveKey = useRef(null); // { key, sig }
  useUnsavedGuard(dirty && !saving, 'Marks are not saved yet. Leave without saving?');

  const ready = Boolean(classId && sectionId && subjectId);
  const sheet = useAsync(
    () => (ready ? principalExamsApi.marksSheet(examId, { classId, sectionId, subjectId }) : Promise.resolve(null)),
    [examId, classId, sectionId, subjectId, ready],
  );
  // While another selection loads, `sheet.data` is still the previous one: never show or save it.
  const payload = sheet.loading || sheet.error ? null : sheet.data?.data;
  const students = useMemo(() => payload?.students || [], [payload]);
  const max = payload?.examSubject?.maxMarks || students[0]?.maxMarks || 100;

  // New sheet from the server (selection changed or saved): rebuild the rows.
  // Adjusting state during render (not in an effect) avoids a flash of stale rows.
  const [builtFrom, setBuiltFrom] = useState(null);
  if (payload !== builtFrom) {
    setBuiltFrom(payload);
    const r = {};
    for (const s of payload?.students || []) {
      r[s.studentId] = {
        marks: s.marksObtained == null ? '' : String(s.marksObtained),
        att: s.attendanceStatus || 'PRESENT',
        remarks: s.remarks || '',
      };
    }
    setRows(r);
    setDirty(false);
  }

  const invalid = useMemo(() => {
    const bad = new Set();
    for (const [sid, r] of Object.entries(rows)) {
      if (r.att !== 'PRESENT' || r.marks === '') continue;
      const n = Number(r.marks);
      if (!Number.isFinite(n) || n < 0 || n > max) bad.add(sid);
    }
    return bad;
  }, [rows, max]);

  const enteredCount = useMemo(() => Object.values(rows).filter((r) => r.att !== 'PRESENT' || r.marks !== '').length, [rows]);

  const update = useCallback((sid, patch) => {
    setDirty(true);
    saveKey.current = null; // edited since the last attempt: a new key for the new content
    setRows((r) => {
      const next = { ...r[sid], ...patch };
      if (next.att !== 'PRESENT') next.marks = '';
      return { ...r, [sid]: next };
    });
  }, []);

  // Switching class / section / subject throws away unsaved marks, so ask first.
  const guarded = (apply) => async (value) => {
    if (dirty) {
      const ok = await confirm('Discard unsaved marks?', 'Changing the selection will discard marks you have not saved.', { confirmText: 'Discard', destructive: true });
      if (!ok) return;
    }
    apply(value);
  };
  const pickClass = guarded((v) => {
    setClassSel(v);
    setSectionSel('');
    setSubjectSel('');
  });
  const pickSection = guarded(setSectionSel);
  const pickSubject = guarded(setSubjectSel);

  const save = async () => {
    if (invalid.size) {
      showError({ message: `Marks must be between 0 and ${max}. Please fix the highlighted fields.` }, 'Check marks');
      return;
    }
    setSaving(true);
    const sig = `${classId}|${sectionId}|${subjectId}`;
    if (saveKey.current?.sig !== sig) saveKey.current = { key: newIdempotencyKey(), sig };
    try {
      const marksList = Object.entries(rows).map(([studentId, r]) => ({
        studentId,
        attendanceStatus: r.att,
        marksObtained: r.att === 'PRESENT' && r.marks !== '' ? Number(r.marks) : null,
        remarks: r.remarks.trim(),
      }));
      const res = await principalExamsApi.saveMarks(examId, { classId, sectionId, subjectId, marksList }, saveKey.current.key);
      saveKey.current = null;
      toast.success(res?.message || 'Marks saved successfully');
      await sheet.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not save marks');
    } finally {
      setSaving(false);
    }
  };

  if (exam.loading && !exam.data) return <SkeletonSheet chips={4} />;
  if (exam.error && !exam.data) return <ErrorView error={exam.error} onRetry={exam.reload} />;

  const classOptions = (classes || []).map((c) => ({ value: c.id, label: c.name }));
  const sectionOptions = (classSections || []).map((s) => ({ value: s.id, label: `Section ${s.name}` }));
  const subjectOptions = classSubjects.map((s) => ({ value: s.subjectId, label: s.subjectName, sub: `Max ${s.maxMarks}` }));

  const header = (
    <View>
      <Select label="Class" value={classId} options={classOptions} onChange={pickClass} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Select label="Section" value={sectionId} options={sectionOptions} onChange={pickSection} placeholder={classSections ? 'No sections' : 'Loading...'} />
        </View>
        <View style={{ flex: 1 }}>
          <Select label="Subject" value={subjectId} options={subjectOptions} onChange={pickSubject} placeholder={examSubjects.loading ? 'Loading...' : 'No subjects'} />
        </View>
      </View>
      {payload ? (
        <View style={[styles.statBanner, { borderColor: theme.border }]}>
          <View style={styles.bannerCol}>
            <Text style={styles.bannerVal}>{max}</Text>
            <Text style={styles.bannerLbl}>Max Marks</Text>
          </View>
          <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
          <View style={styles.bannerCol}>
            <Text style={styles.bannerVal}>{payload.examSubject?.passingMarks ?? '–'}</Text>
            <Text style={styles.bannerLbl}>Pass Marks</Text>
          </View>
          <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
          <View style={styles.bannerCol}>
            <Text style={[styles.bannerVal, { color: theme.primary }]}>{enteredCount}/{students.length}</Text>
            <Text style={styles.bannerLbl}>Entered</Text>
          </View>
        </View>
      ) : null}
      <View style={{ height: spacing.md }} />
    </View>
  );

  let body;
  if (!ready) {
    body = (
      <EmptyState
        icon="create-outline"
        title={classSubjects.length || !examSubjects.data ? 'Select class, section and subject' : 'No subjects for this class'}
        message={classSubjects.length || !examSubjects.data ? 'Choose what to enter marks for.' : 'Add subjects to this exam first (Exam subjects).'}
      />
    );
  } else if (sheet.loading) {
    body = <SkeletonSheet chips={0} />;
  } else if (sheet.error) {
    body = <ErrorView error={sheet.error} onRetry={sheet.reload} />;
  } else {
    body = null;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: 'Marks Entry' }} />
      <FlatList
        data={body ? [] : students}
        keyExtractor={(s) => s.studentId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}
        ListHeaderComponent={header}
        ListEmptyComponent={body || <EmptyState icon="people-outline" title="No enrolled students" message="Check that students are active and enrolled in this section." />}
        initialNumToRender={10}
        windowSize={7}
        renderItem={({ item }) => (
          <MarkRow item={item} r={rows[item.studentId] || EMPTY_ROW} bad={invalid.has(item.studentId)} max={max} onUpdate={update} styles={styles} theme={theme} />
        )}
      />
      {ready && students.length ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={dirty ? 'Save Marks' : 'Saved'} icon="save-outline" loading={saving} loadingTitle="Saving..." disabled={!dirty} onPress={save} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// One student's card, memoized so typing re-renders only that row.
const EMPTY_ROW = { marks: '', att: 'PRESENT', remarks: '' };
const MarkRow = memo(function MarkRow({ item, r, bad, max, onUpdate, styles, theme }) {
  const evaluation = computeGrade(r.marks, max);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.roll}>{item.rollNumber || '–'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{item.studentName}</Text>
          <Text style={styles.adm} numberOfLines={1}>{item.admissionNumber}</Text>
        </View>
        {evaluation ? <Badge label={`${evaluation.grade} (${evaluation.pct}%)`} tone={evaluation.tone} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TextInput
            value={r.marks}
            editable={r.att === 'PRESENT'}
            onChangeText={(v) => onUpdate(item.studentId, { marks: v.replace(/[^\d.]/g, '').slice(0, 6) })}
            keyboardType="decimal-pad"
            placeholder={r.att === 'PRESENT' ? '—' : 'n/a'}
            placeholderTextColor={theme.textMuted}
            selectTextOnFocus
            style={[styles.marks, bad && { borderColor: theme.danger, backgroundColor: alpha(theme.danger, 0.08) }, r.att !== 'PRESENT' && { opacity: 0.5 }]}
          />
          <Text style={styles.muted}>/{max}</Text>
        </View>
      </View>
      <View style={styles.attRow}>
        {ATTENDANCE.map((a) => {
          const active = r.att === a.key;
          return (
            <Pressable
              key={a.key}
              onPress={() => onUpdate(item.studentId, { att: a.key })}
              style={[styles.att, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel={a.key}
            >
              <Text style={{ fontSize: font.xs, fontWeight: '800', color: active ? theme.onPrimary : theme.text }}>{a.short}</Text>
            </Pressable>
          );
        })}
        <TextInput
          value={r.remarks}
          onChangeText={(v) => onUpdate(item.studentId, { remarks: v })}
          placeholder="Remarks (optional)"
          placeholderTextColor={theme.textMuted}
          maxLength={500}
          style={styles.remarks}
        />
      </View>
    </View>
  );
});

const makeStyles = (t) =>
  StyleSheet.create({
    statBanner: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, alignItems: 'center', justifyContent: 'space-around' },
    bannerCol: { alignItems: 'center' },
    bannerVal: { fontSize: font.lg, fontWeight: '800', color: t.text },
    bannerLbl: { fontSize: font.xs, fontWeight: '600', color: t.textMuted, marginTop: 2 },
    bannerDivider: { width: 1, height: 28 },
    muted: { fontSize: font.sm, color: t.textMuted },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    roll: { minWidth: 28, fontWeight: '800', color: t.primary },
    name: { fontSize: font.md, fontWeight: '700', color: t.text },
    adm: { fontSize: font.xs, color: t.textMuted, marginTop: 1 },
    marks: { width: 64, height: 40, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.sm, textAlign: 'center', color: t.text, fontSize: font.lg, fontWeight: '800', backgroundColor: t.surfaceAlt },
    attRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    att: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1.5 },
    remarks: { flex: 1, height: 34, borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, color: t.text, fontSize: font.sm },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
  });
