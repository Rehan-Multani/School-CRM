import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { toast, showError } from '../../../../lib/notify';
import { useUnsavedGuard } from '../../../../lib/useUnsavedGuard';
import { DateField, ErrorView, Select } from '../../../../components/kit';
import { Button, Input } from '../../../../components/ui';
import { SkeletonForm } from '../../../../components/Skeleton';
import { FormScreen } from '../../../../components/principal/academics/kit';

// Create (no `id`) or edit (`?id=`) an academic year.
export default function YearForm() {
  const { id } = useLocalSearchParams();
  const existing = useAsync(() => (id ? api.getYear(id) : Promise.resolve(null)), [id]);
  if (id && existing.loading && !existing.data) return <SkeletonForm fields={5} />;
  if (id && existing.error && !existing.data) return <ErrorView error={existing.error} onRetry={existing.reload} />;
  return <YearFormBody id={id} year={existing.data} />;
}

function YearFormBody({ id, year }) {
  const [form, setForm] = useState({
    name: year?.name || '',
    code: year?.code || '',
    startDate: year?.startDate?.slice(0, 10) || '',
    endDate: year?.endDate?.slice(0, 10) || '',
    status: year?.status || 'DRAFT',
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

  const statusOptions = id
    ? ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((s) => ({ value: s, label: s }))
    : ['DRAFT', 'ACTIVE'].map((s) => ({ value: s, label: s }));

  const submit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Enter the academic year name';
    if (!form.startDate) e.startDate = 'Pick a start date';
    if (!form.endDate) e.endDate = 'Pick an end date';
    if (form.startDate && form.endDate && form.endDate < form.startDate) e.endDate = 'End date must be after the start date';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = { ...form, name: form.name.trim(), code: form.code.trim() };
      if (id) await api.updateYear(id, body);
      else await api.createYear(body);
      setDirty(false);
      toast.success(id ? 'Academic year updated' : 'Academic year created');
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit Academic Year' : 'New Academic Year' }} />
      <FormScreen>
        <Input label="Academic year name" required value={form.name} onChangeText={set('name')} placeholder="e.g. 2026-27" error={errors.name} />
        <Input label="Code" value={form.code} onChangeText={set('code')} placeholder="e.g. AY-2026-27" autoCapitalize="characters" />
        <DateField label="Start date" value={form.startDate} onChange={set('startDate')} error={errors.startDate} />
        <DateField label="End date" value={form.endDate} onChange={set('endDate')} minimumDate={form.startDate ? new Date(form.startDate) : undefined} error={errors.endDate} />
        <Select label="Status" value={form.status} options={statusOptions} onChange={set('status')} />
        <Button title={id ? 'Update academic year' : 'Save academic year'} icon="checkmark-circle-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </FormScreen>
    </>
  );
}
