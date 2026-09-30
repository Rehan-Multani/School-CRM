import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { newIdempotencyKey, teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { useUnsavedGuard } from '../../../lib/useUnsavedGuard';
import { showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { Badge, EmptyState, ErrorView } from '../../../components/kit';
import { alpha, font, radius, spacing } from '../../../theme';
import { SkeletonSheet } from '../../../components/Skeleton';

// Doc §6.6 — marks grid: marks (numeric), attendance (PRESENT/ABSENT/MEDICAL/
// EXEMPTED), remarks. 0 ≤ marks ≤ max checked here too; marks cleared when not
// PRESENT. Save all = one POST with an Idempotency-Key. Locked exam = read-only.
const ATT = [
  { key: 'PRESENT', short: 'P' },
  { key: 'ABSENT', short: 'AB' },
  { key: 'MEDICAL', short: 'MED' },
  { key: 'EXEMPTED', short: 'EX' },
];

function computeGrade(marks, max) {
  if (marks === '' || marks == null || isNaN(marks) || !max) return null;
  const num = Number(marks);
  if (num < 0 || num > max) return null;
  const pct = (num / Number(max)) * 100;
  if (pct >= 90) return { grade: 'A+', tone: 'success', pct: Math.round(pct) };
  if (pct >= 80) return { grade: 'A', tone: 'success', pct: Math.round(pct) };
  if (pct >= 70) return { grade: 'B', tone: 'primary', pct: Math.round(pct) };
  if (pct >= 60) return { grade: 'C', tone: 'warning', pct: Math.round(pct) };
  if (pct >= 50) return { grade: 'D', tone: 'warning', pct: Math.round(pct) };
  if (pct >= 33) return { grade: 'E', tone: 'danger', pct: Math.round(pct) };
  return { grade: 'F', tone: 'danger', pct: Math.round(pct) };
}

export default function MarksEntry() {
  const { examId, classId, sectionId, subjectId, title } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState({}); // studentId -> { marks, att, remarks }
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveKey = useRef(null);
  useUnsavedGuard(dirty && !saving, 'Marks are not saved yet. Leave without saving?');

  useEffect(() => {
    if (title) navigation.setOptions({ title: String(title) });
  }, [navigation, title]);

  const sheet = useAsync(() => teacherApi.marksSheet(examId, { classId, sectionId, subjectId }), [examId, classId, sectionId, subjectId]);
  const max = sheet.data?.examSubject?.maxMarks || sheet.data?.students?.[0]?.maxMarks || 100;
  const locked = Boolean(sheet.data?.locked);

  useEffect(() => {
    if (!sheet.data) return;
    const r = {};
    for (const s of sheet.data.students || []) {
      r[s.studentId] = {
        marks: s.marksObtained == null ? '' : String(s.marksObtained),
        att: s.attendanceStatus || 'PRESENT',
        remarks: s.remarks || '',
      };
    }
    setRows(r);
    setDirty(false);
  }, [sheet.data]);

  const invalid = useMemo(() => {
    const bad = new Set();
    for (const [sid, r] of Object.entries(rows)) {
      if (r.att !== 'PRESENT' || r.marks === '') continue;
      const n = Number(r.marks);
      if (!Number.isFinite(n) || n < 0 || n > max) bad.add(sid);
    }
    return bad;
  }, [rows, max]);

  const enteredCount = useMemo(() => {
    return Object.values(rows).filter((r) => r.att !== 'PRESENT' || r.marks !== '').length;
  }, [rows]);

  const update = useCallback(
    (sid, patch) => {
      if (locked) return;
      setDirty(true);
      setRows((r) => {
        const next = { ...r[sid], ...patch };
        if (next.att !== 'PRESENT') next.marks = '';
        return { ...r, [sid]: next };
      });
    },
    [locked],
  );

  const save = async () => {
    if (invalid.size) {
      showError({ message: `Marks must be between 0 and ${max}. Please fix the highlighted fields.` }, 'Check marks');
      return;
    }
    setSaving(true);
    saveKey.current = saveKey.current || newIdempotencyKey();
    try {
      const marksList = Object.entries(rows).map(([studentId, r]) => ({
        studentId,
        attendanceStatus: r.att,
        marksObtained: r.att === 'PRESENT' && r.marks !== '' ? Number(r.marks) : null,
        remarks: r.remarks.trim(),
      }));
      await teacherApi.saveMarks(examId, { classId, sectionId, subjectId, marksList }, saveKey.current);
      saveKey.current = null;
      toast.success('Marks saved successfully');
      await sheet.reload({ silent: true });
    } catch (e) {
      if (e.code === 'EXAM_FINALIZED') await sheet.reload({ silent: true });
      showError(e, 'Could not save marks');
    } finally {
      setSaving(false);
    }
  };

  if (sheet.loading && !sheet.data) return <SkeletonSheet chips={4} />;
  if (sheet.error && !sheet.data) return <ErrorView error={sheet.error} onRetry={sheet.reload} />;
  const students = sheet.data?.students || [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={students}
        keyExtractor={(s) => s.studentId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }}
        ListHeaderComponent={
          <View style={styles.head}>
            <View style={[styles.statBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.bannerCol}>
                <Text style={styles.bannerVal}>{max}</Text>
                <Text style={styles.bannerLbl}>Max Marks</Text>
              </View>
              <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
              <View style={styles.bannerCol}>
                <Text style={styles.bannerVal}>{sheet.data?.examSubject?.passingMarks ?? '–'}</Text>
                <Text style={styles.bannerLbl}>Pass Marks</Text>
              </View>
              <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
              <View style={styles.bannerCol}>
                <Text style={[styles.bannerVal, { color: theme.primary }]}>
                  {enteredCount}/{students.length}
                </Text>
                <Text style={styles.bannerLbl}>Entered</Text>
              </View>
            </View>
            {locked ? (
              <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
                <Badge label={`${sheet.data?.examStatus || 'LOCKED'} · READ ONLY`} icon="lock-closed" tone="muted" />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="people-outline" title="No students" />}
        initialNumToRender={10}
        windowSize={7}
        renderItem={({ item }) => (
          <MarkRow
            item={item}
            r={rows[item.studentId] || EMPTY_ROW}
            bad={invalid.has(item.studentId)}
            max={max}
            locked={locked}
            onUpdate={update}
            styles={styles}
            theme={theme}
          />
        )}
      />
      {!locked && students.length ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title={dirty ? 'Save Marks' : 'Saved'}
            icon="save-outline"
            loading={saving}
            loadingTitle="Saving..."
            disabled={!dirty}
            onPress={save}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// One student's marks card. Memoized so typing in one box re-renders that
// row only — not every visible row (inputs, chips, grade badge) per keystroke.
const EMPTY_ROW = { marks: '', att: 'PRESENT', remarks: '' };
const MarkRow = memo(function MarkRow({ item, r, bad, max, locked, onUpdate, styles, theme }) {
  const evaluation = computeGrade(r.marks, max);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.roll}>{item.rollNumber || '–'}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.studentName}
        </Text>

        {/* Live Grade Preview */}
        {evaluation ? (
          <Badge label={`${evaluation.grade} (${evaluation.pct}%)`} tone={evaluation.tone} />
        ) : null}

        {/* Marks Input */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TextInput
            value={r.marks}
            editable={!locked && r.att === 'PRESENT'}
            onChangeText={(v) => onUpdate(item.studentId, { marks: v.replace(/[^\d.]/g, '').slice(0, 6) })}
            keyboardType="decimal-pad"
            placeholder={r.att === 'PRESENT' ? '—' : 'n/a'}
            placeholderTextColor={theme.textMuted}
            style={[
              styles.marks,
              bad && { borderColor: theme.danger, backgroundColor: alpha(theme.danger, 0.08) },
              (locked || r.att !== 'PRESENT') && { opacity: 0.5 },
            ]}
          />
          <Text style={styles.muted}>/{max}</Text>
        </View>
      </View>

      {/* Attendance Status Chips & Remarks */}
      <View style={styles.attRow}>
        {ATT.map((a) => {
          const active = r.att === a.key;
  return (
            <Pressable
              key={a.key}
              disabled={locked}
              onPress={() => onUpdate(item.studentId, { att: a.key })}
              style={[
                styles.att,
                {
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : theme.surfaceAlt,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={{ fontSize: font.xs, fontWeight: '800', color: active ? theme.onPrimary : theme.text }}>
                {a.short}
              </Text>
            </Pressable>
          );
        })}
        <TextInput
          value={r.remarks}
          editable={!locked}
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
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    statBanner: {
      flexDirection: 'row',
      backgroundColor: t.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'space-around',
      marginTop: spacing.xs,
    },
    bannerCol: { alignItems: 'center' },
    bannerVal: { fontSize: font.lg, fontWeight: '800', color: t.text },
    bannerLbl: { fontSize: font.xs, fontWeight: '600', color: t.textMuted, marginTop: 2 },
    bannerDivider: { width: 1, height: 28, backgroundColor: t.border },
    muted: { fontSize: font.sm, color: t.textMuted },
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    roll: { minWidth: 28, fontWeight: '800', color: t.primary },
    name: { flex: 1, fontSize: font.md, fontWeight: '700', color: t.text },
    marks: { width: 64, height: 40, borderWidth: 1.5, borderColor: t.border, borderRadius: radius.sm, textAlign: 'center', color: t.text, fontSize: font.lg, fontWeight: '800', backgroundColor: t.surfaceAlt },
    attRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    att: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1.5 },
    remarks: { flex: 1, height: 34, borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, color: t.text, fontSize: font.sm },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border },
  });
