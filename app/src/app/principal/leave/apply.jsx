import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import { ymd } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { DateField, EmptyState, ErrorView, Select, TextArea } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonForm } from '../../../components/Skeleton';
import { KeyValue, Panel } from '../../../components/principal/monitoring/Common';
import { LEAVE_TYPES } from '../../../components/principal/monitoring/leaveUtils';
import { font, spacing } from '../../../theme';

// Web "Apply for Leave": the principal files a leave request on behalf of a staff member.
export default function ApplyLeave() {
  const styles = useStyles(makeStyles);
  const staff = useAsync(async () => (await api.employees({ limit: 300 }))?.data || [], []);
  const [empId, setEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState(ymd());
  const [endDate, setEndDate] = useState(ymd());
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const employees = staff.data || [];
  const emp = employees.find((e) => e.id === empId);

  const balanceState = useAsync(
    async () => (empId ? (await api.leaveBalance(empId))?.data || null : null),
    [empId],
  );
  const balance = balanceState.error || balanceState.loading ? null : balanceState.data;

  const submit = async () => {
    const e = {};
    if (!empId) e.emp = 'Select a staff member';
    if (!startDate) e.start = 'Pick a start date';
    if (!endDate) e.end = 'Pick an end date';
    if (startDate && endDate && endDate < startDate) e.end = 'End date cannot be before the start date';
    if (!reason.trim()) e.reason = 'Enter a reason';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api.createLeave({
        employeeRefId: empId,
        employeeType: emp?.employeeType || 'STAFF',
        employeeId: emp?.employeeId || 'EMP',
        employeeName: emp?.name || 'Staff',
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        department: emp?.department || '',
      });
      toast(`Leave request submitted for ${emp?.name || 'staff member'}`);
      router.back();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const row = (label, b) => (b ? <KeyValue label={label} value={`${b.available} of ${b.quota} left (${b.used} used)`} /> : null);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Apply for leave' }} />
      {staff.error && !staff.data ? (
        <ErrorView error={staff.error} onRetry={staff.reload} />
      ) : staff.loading && !staff.data ? (
        <SkeletonForm />
      ) : employees.length === 0 ? (
        <EmptyState icon="people-outline" title="No staff members" message="Add staff or teachers before filing a leave request." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>Submit a leave application on behalf of a staff or faculty member.</Text>
          <Select
            label="Staff / faculty member"
            value={empId}
            onChange={setEmpId}
            error={errors.emp}
            options={employees.map((x) => ({ value: x.id, label: `${x.name} (${x.employeeId || 'EMP'})`, sub: x.department || 'General' }))}
          />
          {balance ? (
            <Panel title={`Leave balance ${balance.year || ''}`}>
              {row('Casual', balance.casual)}
              {row('Medical', balance.medical)}
              {row('Paid', balance.paid)}
              {balance.unpaid ? <KeyValue label="Unpaid used" value={`${balance.unpaid.used} day(s)`} /> : null}
            </Panel>
          ) : null}
          <Select label="Leave category" value={leaveType} onChange={setLeaveType} options={LEAVE_TYPES} />
          <DateField label="Start date" value={startDate} onChange={setStartDate} error={errors.start} />
          <DateField label="End date" value={endDate} onChange={setEndDate} error={errors.end} />
          <TextArea
            label="Reason / justification"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Family wedding, or medical rest advised"
            maxLength={500}
            error={errors.reason}
          />
          <View style={{ height: spacing.sm }} />
          <Button title="Submit application" onPress={submit} loading={saving} loadingTitle="Submitting..." />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({ intro: { color: t.textMuted, fontSize: font.md, marginBottom: spacing.lg } });
