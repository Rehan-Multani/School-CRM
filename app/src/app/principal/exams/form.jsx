import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { principalExamsApi } from '../../../api/principal/exams';
import { useAsync } from '../../../lib/useAsync';
import { showError, toast } from '../../../lib/notify';
import { Button, Input } from '../../../components/ui';
import { AsyncView, Chip, DateField, FieldLabel, Select, TextArea } from '../../../components/kit';
import { EXAM_STATUSES, EXAM_TYPES, rows } from '../../../components/principal/exams/constants';
import { font, spacing } from '../../../theme';

const day = (v) => (v ? String(v).slice(0, 10) : '');

// Create (no param) or edit (`examId`) an examination term.
export default function ExamForm() {
  const { examId } = useLocalSearchParams();
  const editing = Boolean(examId);
  const exam = useAsync(() => (editing ? principalExamsApi.get(examId) : Promise.resolve(null)), [examId]);
  const years = useAsync(() => principalExamsApi.years(), []);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: editing ? 'Edit Examination' : 'New Examination' }} />
      <AsyncView state={exam}>
        {(res) => <FormBody key={res?.data?.id || 'new'} existing={res?.data || null} years={rows(years.data)} yearsLoading={years.loading} />}
      </AsyncView>
    </View>
  );
}

function FormBody({ existing, years, yearsLoading }) {
  const theme = useTheme();
  const editing = Boolean(existing);
  const [form, setForm] = useState(() => ({
    name: existing?.name || '',
    academicYearId: existing?.academicYearId || '',
    examType: existing?.examType || 'HALF_YEARLY',
    classIds: existing?.classIds || [],
    startDate: day(existing?.startDate),
    endDate: day(existing?.endDate),
    status: existing?.status || 'DRAFT',
    description: existing?.description || '',
  }));
  const [classesFor, setClassesFor] = useState({ yearId: null, list: [] });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // A new exam defaults to the current session.
  const defaultYear = editing ? '' : (years.find((y) => y.isCurrent) || years[0])?.id || '';
  const yearId = form.academicYearId || defaultYear;

  // Classes mapped to the selected session.
  useEffect(() => {
    if (!yearId) return undefined;
    let live = true;
    principalExamsApi
      .yearClasses(yearId)
      .then((res) => {
        if (!live) return;
        setClassesFor({
          yearId,
          list: rows(res).map((item) => ({
            id: item.classId || item.class?.id || item.id,
            name: item.class?.name || item.name || 'Class',
          })),
        });
      })
      .catch(() => live && setClassesFor({ yearId, list: [] }));
    return () => {
      live = false;
    };
  }, [yearId]);
  const loadingClasses = Boolean(yearId) && classesFor.yearId !== yearId;
  const classes = yearId && classesFor.yearId === yearId ? classesFor.list : [];

  const yearOptions = useMemo(() => years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` })), [years]);
  const statusOptions = useMemo(() => EXAM_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })), []);

  const changeYear = (id) => setForm((f) => ({ ...f, academicYearId: id, classIds: [] }));
  const toggleClass = (id) =>
    setForm((f) => ({ ...f, classIds: f.classIds.includes(id) ? f.classIds.filter((c) => c !== id) : [...f.classIds, id] }));
  const allSelected = classes.length > 0 && form.classIds.length === classes.length;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Enter the examination name';
    if (!yearId) e.academicYearId = 'Select an academic session';
    if (!form.classIds.length) e.classIds = 'Select at least one class';
    if (!form.startDate) e.startDate = 'Pick a start date';
    if (!form.endDate) e.endDate = 'Pick an end date';
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = 'End date cannot be before the start date';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) {
      toast.warning('Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        examType: form.examType,
        classIds: form.classIds,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim(),
        status: form.status,
      };
      if (editing) {
        const res = await principalExamsApi.update(existing.id, body);
        toast.success(res?.message || 'Exam updated');
        router.back();
      } else {
        const res = await principalExamsApi.create({ ...body, academicYearId: yearId, gradingType: 'PERCENTAGE' });
        toast.success(res?.message || 'Examination created');
        const id = res?.data?.id;
        if (id) router.replace({ pathname: '/principal/exams/[examId]', params: { examId: id, name: body.name } });
        else router.back();
      }
    } catch (e) {
      showError(e, editing ? 'Could not update exam' : 'Could not create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Input label="Examination name" required value={form.name} onChangeText={set('name')} error={errors.name} placeholder="e.g. Half Yearly Examination 2026-27" maxLength={120} />
        <Select
          label="Academic session"
          value={yearId}
          options={yearOptions}
          onChange={changeYear}
          error={errors.academicYearId}
          disabled={editing || yearsLoading}
        />
        <Select label="Exam type" value={form.examType} options={EXAM_TYPES} onChange={set('examType')} />
        {editing ? <Select label="Status" value={form.status} options={statusOptions} onChange={set('status')} /> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <FieldLabel>Target classes *</FieldLabel>
          {classes.length ? (
            <Text
              onPress={() => set('classIds')(allSelected ? [] : classes.map((c) => c.id))}
              style={{ color: theme.primary, fontWeight: '700', fontSize: font.sm, marginBottom: spacing.sm }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </Text>
          ) : null}
        </View>
        {loadingClasses ? (
          <Text style={{ color: theme.textMuted, marginBottom: spacing.lg }}>Loading classes...</Text>
        ) : !classes.length ? (
          <Text style={{ color: theme.warning, marginBottom: spacing.lg }}>No classes are mapped to this session. Configure them in Academics first.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
            {classes.map((c) => (
              <Chip key={c.id} label={c.name} active={form.classIds.includes(c.id)} onPress={() => toggleClass(c.id)} />
            ))}
          </View>
        )}
        {errors.classIds ? <Text style={{ color: theme.danger, fontSize: font.sm, marginBottom: spacing.md }}>{errors.classIds}</Text> : null}
        <View style={{ height: spacing.md }} />

        <DateField label="Start date" value={form.startDate} onChange={set('startDate')} error={errors.startDate} />
        <DateField label="End date" value={form.endDate} onChange={set('endDate')} minimumDate={undefined} error={errors.endDate} />
        <TextArea label="Description / notes" value={form.description} onChangeText={set('description')} placeholder="Optional guidelines for students and teachers" maxLength={500} />
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
        <Button title={editing ? 'Save changes' : 'Create exam'} icon="save-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}
