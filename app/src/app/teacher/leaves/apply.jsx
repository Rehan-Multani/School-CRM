import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { parseYmd, ymd } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button } from '../../../components/ui';
import { DateField, Select, TextArea } from '../../../components/kit';
import { spacing } from '../../../theme';

const TYPES = ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER'].map((t) => ({
  value: t,
  label: t[0] + t.slice(1).toLowerCase(),
}));

function days(a, b) {
  if (!a || !b || b < a) return 0;
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000) + 1;
}

export default function ApplyLeave() {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const [form, setForm] = useState({ leaveType: 'CASUAL', startDate: ymd(), endDate: ymd(), reason: '' });
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
      await teacherApi.applyLeave({ ...form, reason: form.reason.trim() });
      toast('Leave request sent');
      router.back();
    } catch (err) {
      showError(err, 'Could not apply');
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
        <Button title="Submit request" icon="paper-plane-outline" loading={saving} loadingTitle="Submitting request..." onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
