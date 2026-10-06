import { useState } from 'react';
import { Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../../api/principal/academics';
import { useAsync } from '../../../../../lib/useAsync';
import { useTheme } from '../../../../../context/ThemeContext';
import { toast, showError } from '../../../../../lib/notify';
import { ErrorView, Select } from '../../../../../components/kit';
import { Button } from '../../../../../components/ui';
import { SkeletonForm } from '../../../../../components/Skeleton';
import { FormScreen } from '../../../../../components/principal/academics/kit';
import { font, spacing } from '../../../../../theme';

// Map a class from the school master list into this academic year.
export default function AddClassToYear() {
  const { yearId } = useLocalSearchParams();
  const theme = useTheme();
  const [classId, setClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const state = useAsync(async () => {
    const [all, mapped] = await Promise.all([api.classes({ limit: 100 }), api.yearClasses(yearId)]);
    return all.filter((c) => !mapped.some((m) => m.classId === c.id));
  }, [yearId]);

  if (state.loading && !state.data) return <SkeletonForm fields={1} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  const available = state.data || [];

  const submit = async () => {
    if (!classId) return toast.info('Select a class first');
    setSaving(true);
    try {
      await api.addClassToYear(yearId, classId);
      toast.success('Class added to academic year');
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Class to Year' }} />
      <FormScreen>
        <Select label="Class" value={classId} onChange={setClassId} options={available.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose class" />
        {!available.length ? (
          <Text style={{ color: theme.textMuted, fontSize: font.sm, marginBottom: spacing.lg }}>
            No classes available to add. Create classes first from Academics, Classes.
          </Text>
        ) : null}
        <Button title="Add class" icon="add-circle-outline" disabled={!classId} loading={saving} loadingTitle="Adding..." onPress={submit} />
        {!available.length ? (
          <Button title="Go to classes" variant="ghost" onPress={() => router.replace('/principal/academics/classes')} style={{ marginTop: spacing.sm }} />
        ) : null}
      </FormScreen>
    </>
  );
}
