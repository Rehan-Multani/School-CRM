import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast, showError } from '../../../../lib/notify';
import { useUnsavedGuard } from '../../../../lib/useUnsavedGuard';
import { Chip, ErrorView, FieldLabel, Select } from '../../../../components/kit';
import { Button, Input } from '../../../../components/ui';
import { SkeletonForm } from '../../../../components/Skeleton';
import { FormScreen, STATUS_OPTIONS, SUBJECT_TYPES } from '../../../../components/principal/academics/kit';
import { font, spacing } from '../../../../theme';

// Create a subject (optionally mapping it to classes), or edit one with `?id=`.
export default function SubjectForm() {
  const { id } = useLocalSearchParams();
  const state = useAsync(async () => {
    const [subjects, classes, years] = await Promise.all([
      id ? api.subjects({ limit: 1000 }) : Promise.resolve([]),
      id ? Promise.resolve([]) : api.classes({ limit: 100 }),
      id ? Promise.resolve([]) : api.years({ limit: 100 }),
    ]);
    return { subject: id ? subjects.find((s) => s.id === id) || null : null, classes: classes.filter((c) => c.status === 'ACTIVE'), years };
  }, [id]);
  if (state.loading && !state.data) return <SkeletonForm fields={5} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  return <Body id={id} {...state.data} />;
}

function Body({ id, subject, classes, years }) {
  const theme = useTheme();
  const [form, setForm] = useState({
    name: subject?.name || '',
    code: subject?.code || '',
    subjectType: subject?.subjectType || 'THEORY',
    description: subject?.description || '',
    status: subject?.status || 'ACTIVE',
    classIds: [],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty && !saving);
  const set = (k) => (v) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'name') setError('');
  };
  const toggleClass = (cid) => set('classIds')(form.classIds.includes(cid) ? form.classIds.filter((x) => x !== cid) : [...form.classIds, cid]);

  const submit = async () => {
    if (!form.name.trim()) return setError('Enter the subject name');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim(), subjectType: form.subjectType, description: form.description.trim(), status: form.status };
      if (id) {
        await api.updateSubject(id, payload);
        toast.success('Subject updated');
      } else {
        const res = await api.createSubject(payload);
        const created = res?.data;
        toast.success('Subject created');
        // Same as the web: map the new subject onto every active section of the picked classes in the current year.
        if (form.classIds.length && created?.id) {
          const year = years.find((y) => y.isCurrent) || years.find((y) => y.status === 'ACTIVE');
          if (year) {
            const sections = await api.sections({ limit: 1000 });
            const targets = sections.filter((s) => form.classIds.includes(s.classId) && s.academicYearId === year.id && s.status === 'ACTIVE');
            let mapped = 0;
            for (const sec of targets) {
              try {
                await api.addSectionSubject(sec.id, { subjectId: created.id, maxMarks: 100, passingMarks: 33, isOptional: false });
                mapped += 1;
              } catch {
                // a section that already has it (or rejects it) is skipped
              }
            }
            if (mapped) toast.success(`Subject mapped to ${mapped} sections of the selected classes`);
          }
        }
      }
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit Subject' : 'Create Subject' }} />
      <FormScreen>
        <Input label="Subject name" required value={form.name} onChangeText={set('name')} placeholder="e.g. Mathematics" error={error} />
        <Input label="Code" value={form.code} onChangeText={set('code')} placeholder="e.g. MATH" autoCapitalize="characters" />
        <Select label="Type" value={form.subjectType} onChange={set('subjectType')} options={SUBJECT_TYPES.map((t) => ({ value: t, label: t }))} />
        <Input label="Description" value={form.description} onChangeText={set('description')} placeholder="Optional" multiline />
        {!id ? (
          <View style={{ marginBottom: spacing.lg }}>
            <FieldLabel>Assign to classes (current year)</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {classes.map((c) => (
                <Chip key={c.id} label={c.name} active={form.classIds.includes(c.id)} onPress={() => toggleClass(c.id)} />
              ))}
            </View>
            <Text style={{ color: theme.textMuted, fontSize: font.sm, marginTop: spacing.xs }}>
              {classes.length ? 'Optional. The subject is added to every active section of the picked classes.' : 'No active classes yet.'}
            </Text>
          </View>
        ) : null}
        <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
        <Button title={id ? 'Update subject' : 'Save subject'} icon="checkmark-circle-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </FormScreen>
    </>
  );
}
