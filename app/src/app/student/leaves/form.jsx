import { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { parseYmd, ymd } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button } from '../../../components/ui';
import { DateField, EmptyState, ErrorView, Select, TextArea } from '../../../components/kit';
import { SkeletonForm } from '../../../components/Skeleton';
import { spacing } from '../../../theme';

// Doc §6.8 — CASUAL | MEDICAL | PAID | UNPAID | OTHER; from, to, reason.
const TYPES = ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'OTHER'].map((t) => ({ value: t, label: t[0] + t.slice(1).toLowerCase() }));

function days(a, b) {
  if (!a || !b || b < a) return 0;
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000) + 1;
}

function Form({ id, initial }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v, ...(k === 'startDate' && f.endDate < v ? { endDate: v } : {}) }));
  const total = days(form.startDate, form.endDate);

  const submit = async () => {
    const e = {};
    if (form.endDate < form.startDate) e.endDate = 'End date cannot be before start date';
    if (total > 366) e.endDate = 'A single request can cover at most 366 days';
    if (form.reason.trim().length < 3) e.reason = 'Please give a reason';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = { ...form, reason: form.reason.trim() };
      if (id) await studentApi.updateLeave(id, body);
      else await studentApi.applyLeave(body);
      toast(id ? 'Leave updated' : 'Leave request sent');
      router.back();
    } catch (err) {
      if (err.code === 'LEAVE_OVERLAP') setErrors({ endDate: 'You already have a leave on these dates' });
      else showError(err, id ? 'Could not update' : 'Could not apply');
      if (err.code === 'LEAVE_NOT_EDITABLE') router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Select label="Leave type" value={form.leaveType} options={TYPES} onChange={set('leaveType')} />
        <DateField label="From" value={form.startDate} onChange={set('startDate')} />
        <DateField label="To" value={form.endDate} onChange={set('endDate')} minimumDate={parseYmd(form.startDate)} error={errors.endDate} />
        <View style={{ marginTop: -spacing.sm, marginBottom: spacing.lg }}>
          <Text style={{ color: theme.textMuted }}>
            {total} day{total === 1 ? '' : 's'}
          </Text>
        </View>
        <TextArea label="Reason" value={form.reason} onChangeText={set('reason')} maxLength={1000} error={errors.reason} placeholder="Why do you need leave?" />
        <Button title={id ? 'Save changes' : 'Submit request'} icon={id ? 'checkmark' : 'paper-plane-outline'} loading={saving} loadingTitle={id ? 'Saving changes...' : 'Submitting request...'} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Apply (no `id`) or edit a PENDING request (`?id=`).
export default function LeaveForm() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const state = useAsync(() => (id ? studentApi.leave(id) : Promise.resolve(null)), [id]);

  useLayoutEffect(() => {
    if (id) navigation.setOptions({ title: 'Edit Leave' });
  }, [id, navigation]);

  if (!id) return <Form initial={{ leaveType: 'CASUAL', startDate: ymd(), endDate: ymd(), reason: '' }} />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!state.data) return <SkeletonForm fields={4} />;
  const l = state.data;
  if (l.status !== 'PENDING') {
    return <EmptyState icon="lock-closed-outline" title="Cannot edit" message="Only a pending leave can be edited." />;
  }
  return (
    <Form
      id={id}
      initial={{ leaveType: l.leaveType, startDate: String(l.startDate).slice(0, 10), endDate: String(l.endDate).slice(0, 10), reason: l.reason || '' }}
    />
  );
}
