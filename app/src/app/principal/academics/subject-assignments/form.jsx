import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast, showError } from '../../../../lib/notify';
import { useUnsavedGuard } from '../../../../lib/useUnsavedGuard';
import { ErrorView, Select } from '../../../../components/kit';
import { Button, Card, Input } from '../../../../components/ui';
import { SkeletonForm } from '../../../../components/Skeleton';
import { FormScreen, STATUS_OPTIONS, ToggleRow, teacherLabel } from '../../../../components/principal/academics/kit';
import { font, spacing } from '../../../../theme';

// Assign a subject to a section (create), or edit an assignment with `?id=`.
// Presets: `sectionId` / `yearId` / `classId` (opened from a section page).
export default function AssignmentForm() {
  const { id, sectionId, yearId, classId } = useLocalSearchParams();
  const state = useAsync(async () => {
    const [years, classes, sections, subjects, teachers, assignments] = await Promise.all([
      api.years({ limit: 100 }),
      api.classes({ limit: 100 }),
      api.sections({ limit: 1000 }),
      api.subjects({ limit: 1000 }),
      api.teachers({ limit: 1000 }),
      id ? api.allSectionSubjects() : Promise.resolve([]),
    ]);
    return {
      years,
      classes: classes.filter((c) => c.status === 'ACTIVE'),
      sections: sections.filter((s) => s.status === 'ACTIVE'),
      subjects: subjects.filter((s) => s.status === 'ACTIVE'),
      teachers: teachers.filter((t) => t.status === 'ACTIVE'),
      assignment: id ? assignments.find((a) => a.id === id) || null : null,
    };
  }, [id]);
  if (state.loading && !state.data) return <SkeletonForm fields={7} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (id && !state.data.assignment) return <ErrorView error={new Error('This assignment no longer exists.')} onRetry={state.reload} />;
  return <Body id={id} presets={{ sectionId, yearId, classId }} {...state.data} />;
}

function Body({ id, presets, years, classes, sections, subjects, teachers, assignment }) {
  const theme = useTheme();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(() => {
    if (assignment) {
      return {
        academicYearId: assignment.academicYearId || '',
        classId: assignment.classId || '',
        sectionId: assignment.sectionId || '',
        subjectId: assignment.subjectId || '',
        teacherId: assignment.teacherId || '',
        maxMarks: String(assignment.maxMarks ?? 100),
        passingMarks: String(assignment.passingMarks ?? 33),
        isOptional: Boolean(assignment.isOptional),
        status: assignment.status || 'ACTIVE',
      };
    }
    const preset = presets.sectionId ? sections.find((s) => s.id === presets.sectionId) : null;
    const activeYear = years.find((y) => y.isCurrent || y.status === 'ACTIVE') || years[0];
    return {
      academicYearId: preset?.academicYearId || presets.yearId || activeYear?.id || '',
      classId: preset?.classId || presets.classId || '',
      sectionId: preset?.id || '',
      subjectId: '',
      teacherId: '',
      maxMarks: '100',
      passingMarks: '33',
      isOptional: false,
      status: 'ACTIVE',
    };
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty && !saving);

  const set = (k) => (v) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const sectionOptions = useMemo(
    () => sections.filter((s) => s.classId === form.classId && (!form.academicYearId || s.academicYearId === form.academicYearId)),
    [sections, form.classId, form.academicYearId],
  );
  const teacherOptions = [{ value: '', label: 'Vacant / unassigned' }, ...teachers.map((t) => ({ value: t.id, label: teacherLabel(t) }))];
  const num = (v, d) => Number(v) || d;

  const submit = async () => {
    const e = {};
    if (!isEdit) {
      if (!form.classId) e.classId = 'Select a class';
      if (!form.sectionId) e.sectionId = 'Select a section';
      if (!form.subjectId) e.subjectId = 'Select a subject';
    }
    const max = num(form.maxMarks, 100);
    const pass = num(form.passingMarks, 33);
    if (pass > max) e.passingMarks = 'Passing marks cannot exceed max marks';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateSectionSubject(id, { teacherId: form.teacherId || null, maxMarks: max, passingMarks: pass, isOptional: form.isOptional, status: form.status || 'ACTIVE' });
        toast.success('Subject assignment updated successfully');
      } else {
        await api.addSectionSubject(form.sectionId, {
          subjectId: form.subjectId,
          teacherId: form.teacherId || null,
          maxMarks: max,
          passingMarks: pass,
          isOptional: form.isOptional,
          status: form.status || 'ACTIVE',
        });
        toast.success('Subject successfully assigned to section');
      }
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const subject = subjects.find((s) => s.id === form.subjectId) || assignment?.subject;

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit Assignment' : 'Assign Subject' }} />
      <FormScreen>
        {isEdit ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>{subject?.name || 'Subject'}</Text>
            <Text style={{ color: theme.textMuted, marginTop: 3 }}>
              {assignment.class?.name || classes.find((c) => c.id === assignment.classId)?.name || 'Class'} - Section {assignment.section?.name || sections.find((s) => s.id === assignment.sectionId)?.name || '-'}
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 3 }}>{assignment.academicYear?.name || years.find((y) => y.id === assignment.academicYearId)?.name || ''}</Text>
          </Card>
        ) : (
          <>
            <Select
              label="Academic year"
              value={form.academicYearId}
              onChange={(v) => setForm((f) => ({ ...f, academicYearId: v, sectionId: '' }))}
              options={years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))}
            />
            <Select
              label="Class"
              value={form.classId}
              onChange={(v) => setForm((f) => ({ ...f, classId: v, sectionId: '' }))}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.classId}
            />
            <Select
              label="Section"
              value={form.sectionId}
              onChange={set('sectionId')}
              options={sectionOptions.map((s) => ({ value: s.id, label: s.name }))}
              disabled={!form.classId}
              placeholder={form.classId && !sectionOptions.length ? 'No sections for this class and year' : 'Select section'}
              error={errors.sectionId}
            />
            <Select label="Subject" value={form.subjectId} onChange={set('subjectId')} options={subjects.map((s) => ({ value: s.id, label: s.code ? `${s.name} (${s.code})` : s.name }))} error={errors.subjectId} />
          </>
        )}
        <Select label="Teacher" value={form.teacherId} onChange={set('teacherId')} options={teacherOptions} placeholder="Vacant / unassigned" />
        <Input label="Max marks" value={form.maxMarks} onChangeText={(v) => set('maxMarks')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
        <Input label="Passing marks" value={form.passingMarks} onChangeText={(v) => set('passingMarks')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" error={errors.passingMarks} />
        <ToggleRow label="Optional subject" value={form.isOptional} onChange={set('isOptional')} />
        <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
        <Button title={isEdit ? 'Save changes' : 'Assign subject'} icon="checkmark-circle-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </FormScreen>
    </>
  );
}
