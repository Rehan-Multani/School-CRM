import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../../api/principal/academics';
import { useAsync } from '../../../../../lib/useAsync';
import { toast, showError } from '../../../../../lib/notify';
import { useUnsavedGuard } from '../../../../../lib/useUnsavedGuard';
import { ErrorView, Select } from '../../../../../components/kit';
import { Button, Input } from '../../../../../components/ui';
import { SkeletonForm } from '../../../../../components/Skeleton';
import { FormScreen, STATUS_OPTIONS, teacherLabel } from '../../../../../components/principal/academics/kit';

const SECTION_NAMES = ['Section A', 'Section B', 'Section C', 'Section D', 'Section E', 'Section F'];

// Add a section to a class in this year (`classId`), or edit one (`sectionId`).
export default function SectionForm() {
  const { yearId, classId, className, sectionId } = useLocalSearchParams();
  const state = useAsync(async () => {
    const [teachers, section] = await Promise.all([
      api.teachers({ status: 'ACTIVE', limit: 1000 }),
      sectionId ? api.getSection(sectionId) : Promise.resolve(null),
    ]);
    return { teachers, section };
  }, [sectionId]);

  if (state.loading && !state.data) return <SkeletonForm fields={5} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  return <Body yearId={yearId} classId={classId} className={className} sectionId={sectionId} teachers={state.data.teachers} section={state.data.section} />;
}

function Body({ yearId, classId, className, sectionId, teachers, section }) {
  const isEdit = Boolean(sectionId);
  const [form, setForm] = useState({
    name: section?.name || '',
    capacity: String(section?.capacity ?? 40),
    roomNumber: section?.roomNumber || '',
    classTeacherId: section?.classTeacherId || section?.classTeacher?.id || '',
    status: section?.status || 'ACTIVE',
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
  const teacherOptions = [{ value: '', label: isEdit ? 'No class teacher (vacant)' : 'Unassigned' }, ...teachers.map((t) => ({ value: t.id, label: teacherLabel(t) }))];

  const submit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Enter the section name';
    const cap = Number(form.capacity);
    if (form.capacity !== '' && (!Number.isFinite(cap) || cap < 1)) e.capacity = 'Capacity must be at least 1';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateSection(sectionId, {
          name: form.name.trim(),
          capacity: cap || 40,
          roomNumber: form.roomNumber.trim(),
          classTeacherId: form.classTeacherId || null,
          status: form.status || 'ACTIVE',
        });
      } else {
        await api.createSection({
          academicYearId: yearId,
          classId,
          name: form.name.trim(),
          capacity: cap || 40,
          roomNumber: form.roomNumber.trim(),
          classTeacherId: form.classTeacherId || undefined,
        });
      }
      toast.success(isEdit ? 'Section updated successfully' : 'Section created');
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? `Edit Section${section?.name ? ` (${section.name})` : ''}` : `Add Section${className ? ` (${className})` : ''}` }} />
      <FormScreen>
        {isEdit ? (
          <Input label="Section name" required value={form.name} onChangeText={set('name')} placeholder="e.g. Section A" error={errors.name} />
        ) : (
          <Select label="Section name" value={form.name} onChange={set('name')} options={SECTION_NAMES.map((s) => ({ value: s, label: s }))} placeholder="Select section" error={errors.name} />
        )}
        <Input label="Capacity" value={form.capacity} onChangeText={(v) => set('capacity')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="e.g. 40" error={errors.capacity} />
        <Input label="Room number" value={form.roomNumber} onChangeText={set('roomNumber')} placeholder="e.g. 204" />
        <Select label={isEdit ? 'Class teacher mentor' : 'Class teacher (optional)'} value={form.classTeacherId} onChange={set('classTeacherId')} options={teacherOptions} placeholder="Unassigned" />
        {isEdit ? <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} /> : null}
        <Button title={isEdit ? 'Save changes' : 'Create section'} icon="checkmark-circle-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </FormScreen>
    </>
  );
}
