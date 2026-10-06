import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../../context/ThemeContext';
import { principalExamsApi } from '../../../../api/principal/exams';
import { useAsync } from '../../../../lib/useAsync';
import { confirm, showError, toast } from '../../../../lib/notify';
import { Button, Card, Input } from '../../../../components/ui';
import { AsyncView, EmptyState, Select } from '../../../../components/kit';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import FormSheet from '../../../../components/principal/exams/FormSheet';
import { rows } from '../../../../components/principal/exams/constants';
import { font, spacing } from '../../../../theme';

const digits = (v) => v.replace(/[^\d]/g, '').slice(0, 4);

// Exam subjects: which subject is examined for which class, with max / passing marks.
export default function ExamSubjects() {
  const { examId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const subjects = useAsync(() => principalExamsApi.subjects(examId), [examId], { refetchOnFocus: true });
  const exam = useAsync(() => principalExamsApi.get(examId), [examId]);
  const master = useAsync(() => principalExamsApi.masterSubjects(), []);
  const [seeding, setSeeding] = useState(false);
  const [sheet, setSheet] = useState(null); // { editing?: subject, classId, subjectId, maxMarks, passingMarks }
  const [saving, setSaving] = useState(false);

  const classOptions = useMemo(() => (exam.data?.data?.classes || []).map((c) => ({ value: c.id, label: c.name })), [exam.data]);
  const subjectOptions = useMemo(() => rows(master.data).map((s) => ({ value: s.id, label: s.name, sub: s.code })), [master.data]);

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await principalExamsApi.seedSubjects(examId);
      toast.success(res?.message || 'Subjects synchronized from academic setup');
      await subjects.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not fetch subjects');
    } finally {
      setSeeding(false);
    }
  };

  const openAdd = () =>
    setSheet({ classId: classOptions[0]?.value || '', subjectId: '', maxMarks: '100', passingMarks: '33' });
  const openEdit = (s) => setSheet({ editing: s, maxMarks: String(s.maxMarks), passingMarks: String(s.passingMarks) });
  const setF = (k) => (v) => setSheet((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const max = Number(sheet.maxMarks);
    const pass = Number(sheet.passingMarks);
    if (!sheet.editing && (!sheet.classId || !sheet.subjectId)) return toast.warning('Select a class and a subject');
    if (!Number.isFinite(max) || max < 1) return toast.warning('Maximum marks must be at least 1');
    if (!Number.isFinite(pass) || pass < 0 || sheet.passingMarks === '') return toast.warning('Enter the passing marks');
    if (pass > max) return toast.warning('Passing marks cannot be more than maximum marks');
    setSaving(true);
    try {
      if (sheet.editing) {
        await principalExamsApi.updateSubject(examId, sheet.editing.id, { maxMarks: max, passingMarks: pass });
        toast.success('Subject updated');
      } else {
        const picked = rows(master.data).find((s) => s.id === sheet.subjectId);
        await principalExamsApi.addSubject(examId, {
          classId: sheet.classId,
          subjectId: sheet.subjectId,
          subjectName: picked?.name,
          subjectCode: picked?.code,
          maxMarks: max,
          passingMarks: pass,
        });
        toast.success('Subject added to exam');
      }
      setSheet(null);
      await subjects.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not save subject');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    const ok = await confirm('Remove subject?', `Remove ${s.subjectName} for ${s.className} from this exam?`, { confirmText: 'Remove', destructive: true });
    if (!ok) return;
    try {
      await principalExamsApi.deleteSubject(examId, s.id);
      toast.success('Subject removed from exam');
      await subjects.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not remove subject');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Exam Subjects' }} />
      <RefreshableScroll onRefresh={() => subjects.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <Button title="Auto-fetch" icon="sparkles-outline" variant="secondary" loading={seeding} loadingTitle="Fetching..." onPress={seed} style={{ flex: 1 }} />
          <Button title="Add subject" icon="add" onPress={openAdd} style={{ flex: 1 }} />
        </View>
        <AsyncView
          state={subjects}
          empty={{
            when: (d) => !rows(d).length,
            view: <EmptyState icon="library-outline" title="No subjects in this exam" message="Tap Auto-fetch to pull the subjects mapped in Academics, or add one manually." />,
          }}
        >
          {(res) =>
            rows(res).map((s) => (
              <Card key={s.id} style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cls}>{s.className}</Text>
                    <Text style={styles.name}>{s.subjectName}{s.subjectCode ? `  (${s.subjectCode})` : ''}</Text>
                    <Text style={styles.meta}>Max {s.maxMarks} · Pass {s.passingMarks}</Text>
                  </View>
                  <Pressable onPress={() => openEdit(s)} hitSlop={10} style={styles.icon} accessibilityLabel="Edit marks">
                    <Ionicons name="create-outline" size={22} color={theme.primary} />
                  </Pressable>
                  <Pressable onPress={() => remove(s)} hitSlop={10} style={styles.icon} accessibilityLabel="Remove subject">
                    <Ionicons name="trash-outline" size={22} color={theme.danger} />
                  </Pressable>
                </View>
              </Card>
            ))
          }
        </AsyncView>
      </RefreshableScroll>

      <FormSheet
        visible={Boolean(sheet)}
        title={sheet?.editing ? `${sheet.editing.subjectName} · ${sheet.editing.className}` : 'Add subject to exam'}
        onClose={() => setSheet(null)}
        onSubmit={save}
        saving={saving}
        submitTitle={sheet?.editing ? 'Save' : 'Add'}
      >
        {sheet ? (
          <>
            {!sheet.editing ? (
              <>
                <Select label="Class" value={sheet.classId} options={classOptions} onChange={setF('classId')} />
                <Select label="Subject" value={sheet.subjectId} options={subjectOptions} onChange={setF('subjectId')} />
              </>
            ) : null}
            <Input label="Max marks" required keyboardType="number-pad" value={sheet.maxMarks} onChangeText={(v) => setF('maxMarks')(digits(v))} />
            <Input label="Passing marks" required keyboardType="number-pad" value={sheet.passingMarks} onChangeText={(v) => setF('passingMarks')(digits(v))} />
          </>
        ) : null}
      </FormSheet>
    </>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cls: { fontSize: font.xs, fontWeight: '800', color: t.primary, textTransform: 'uppercase' },
    name: { fontSize: font.lg, fontWeight: '700', color: t.text, marginTop: 2 },
    meta: { fontSize: font.sm, color: t.textMuted, marginTop: 3 },
    icon: { padding: spacing.sm },
  });
