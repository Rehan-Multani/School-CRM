import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { toast, showError } from '../../../../lib/notify';
import { useUnsavedGuard } from '../../../../lib/useUnsavedGuard';
import { ErrorView, Select } from '../../../../components/kit';
import { Button, Input } from '../../../../components/ui';
import { SkeletonForm } from '../../../../components/Skeleton';
import { FormScreen, STATUS_OPTIONS } from '../../../../components/principal/academics/kit';

// Create a class (optionally mapping it to a year), or edit one with `?id=`.
export default function ClassForm() {
  const { id, yearId } = useLocalSearchParams();
  const state = useAsync(async () => {
    const [cls, years] = await Promise.all([id ? api.getClass(id) : Promise.resolve(null), id ? Promise.resolve([]) : api.years({ limit: 100 })]);
    return { cls, years };
  }, [id]);
  if (state.loading && !state.data) return <SkeletonForm fields={4} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  return <Body id={id} presetYearId={yearId || ''} cls={state.data.cls} years={state.data.years} />;
}

function Body({ id, presetYearId, cls, years }) {
  const [form, setForm] = useState({
    name: cls?.name || '',
    description: cls?.description || '',
    status: cls?.status || 'ACTIVE',
    academicYearId: presetYearId,
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

  const submit = async () => {
    const name = form.name.trim();
    if (!name) return setError('Enter the class name');
    setSaving(true);
    try {
      const payload = {
        name,
        description: form.description.trim() || `Reusable ${name} class for academic year planning and section mapping.`,
        status: form.status,
      };
      if (id) {
        await api.updateClass(id, payload);
        toast.success('Class updated');
      } else {
        const res = await api.createClass(payload);
        toast.success('Class created');
        const newId = res?.data?.id;
        if (form.academicYearId && newId) {
          await api.addClassToYear(form.academicYearId, newId);
          toast.success('Class mapped to academic year successfully');
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
      <Stack.Screen options={{ title: id ? 'Edit Class' : 'Create Class' }} />
      <FormScreen>
        <Input label="Class name" required value={form.name} onChangeText={set('name')} placeholder="e.g. Nursery, LKG, Class 1" error={error} />
        <Input label="Description" value={form.description} onChangeText={set('description')} placeholder="Reusable class for academic year planning" />
        {!id ? (
          <Select
            label="Map to academic year"
            value={form.academicYearId}
            onChange={set('academicYearId')}
            options={[{ value: '', label: 'Do not map (global only)' }, ...years.map((y) => ({ value: y.id, label: y.name }))]}
            placeholder="Do not map (global only)"
          />
        ) : null}
        <Select label="Status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
        <Button title={id ? 'Update class' : 'Save class'} icon="checkmark-circle-outline" loading={saving} loadingTitle="Saving..." onPress={submit} />
      </FormScreen>
    </>
  );
}
