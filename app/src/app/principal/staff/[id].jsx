import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalPeopleApi } from '../../../api/principal/people';
import { useAsync } from '../../../lib/useAsync';
import { confirm, showError, toast } from '../../../lib/notify';
import { fmtDate } from '../../../lib/format';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { SkeletonDetail } from '../../../components/Skeleton';
import { Badge, ErrorView } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { spacing } from '../../../theme';
import { Block, DocView, InfoList, PasswordSheet, ProfileHeader, StatusPill } from '../../../components/principal/people/shared';
import { ROLE_LABELS, ROLE_TONES } from '../../../components/principal/people/staffRoles';

// Web: Staff Detail (profile, employment, bank, login security, documents + actions).
export default function PrincipalStaffDetail() {
  const { id } = useLocalSearchParams();
  const state = useAsync(() => principalPeopleApi.user(id), [id], { refetchOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const u = state.data?.data;

  if (state.loading && !state.data) return <SkeletonDetail avatar />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!u) return <ErrorView error={new Error('User not found')} onRetry={state.reload} />;

  const bank = u.bankDetails || {};
  const act = async (fn, okMsg, errMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      toast(typeof okMsg === 'function' ? okMsg(res) : okMsg);
      await state.reload({ silent: true });
    } catch (e) {
      showError(e, errMsg);
    } finally {
      setBusy(false);
    }
  };
  const toggle = () => {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return act(() => principalPeopleApi.setUserStatus(u.id, next), `User status marked as ${next}`, 'Failed to update user status');
  };
  const remove = async () => {
    const ok = await confirm('Delete staff user?', `Permanently remove "${u.name}" (${u.employeeId})? This cannot be undone.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await principalPeopleApi.deleteUser(u.id);
      toast('User deleted successfully');
      router.back();
    } catch (e) {
      showError(e, 'Failed to delete user');
      setBusy(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <Stack.Screen options={{ title: u.name }} />
      <ProfileHeader
        photo={u.photo}
        name={u.name}
        badges={
          <>
            <Badge label={ROLE_LABELS[u.role] || u.role} tone={ROLE_TONES[u.role] || 'primary'} />
            <StatusPill status={u.status} />
          </>
        }
        lines={[`EMP ID: ${u.employeeId}`, u.email, u.phone]}
      />

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button title="Edit Staff User" icon="create-outline" onPress={() => router.push({ pathname: '/principal/staff/form', params: { id: u.id } })} />
        <Button title="Send Password to Email" icon="send-outline" variant="secondary" loading={busy} onPress={() => act(() => principalPeopleApi.sendUserCredentials(u.id), (r) => r?.message || `Credentials dispatched to ${u.email}`, 'Failed to send credentials email')} />
        <Button title="Change Password" icon="key-outline" variant="secondary" onPress={() => setPwOpen(true)} />
        <Button title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} icon="power-outline" variant="secondary" loading={busy} onPress={toggle} />
      </View>

      <Block title="Personal & Contact Details">
        <InfoList rows={[['First Name', u.firstName], ['Last Name', u.lastName], ['Email Address', u.email], ['Phone / Mobile', u.phone], ['Gender', u.gender], ['Specialization', u.specialization]]} />
      </Block>
      <Block title="Employment & Department">
        <InfoList
          rows={[
            ['Employee ID', u.employeeId],
            ['Assigned Role', ROLE_LABELS[u.role] || u.role],
            ['Department', u.department],
            ['Designation', u.designation],
            ['Joining Date', u.joiningDate ? fmtDate(u.joiningDate) : ''],
            ['Account Status', u.status],
          ]}
        />
      </Block>
      <Block title="Bank Account & Payroll">
        <InfoList
          rows={[
            ['Basic Monthly Salary', u.basicSalary ? `₹${Number(u.basicSalary).toLocaleString('en-IN')} / month` : '₹0'],
            ['Account Type', bank.accountType || 'SALARY'],
            ['Account Holder Name', bank.accountName],
            ['Account Number', bank.accountNumber],
            ['IFSC Code', bank.ifscCode],
            ['Bank Name', bank.bankName],
            ['Branch Name', bank.branchName],
          ]}
        />
      </Block>
      <Block title="Login Security & Activity">
        <InfoList
          rows={[
            ['Login Email', u.email],
            ['Last Login', u.lastLoginAt ? fmtDate(u.lastLoginAt) : ''],
            ['Credentials Dispatched', u.credentialsSentAt ? fmtDate(u.credentialsSentAt) : ''],
            ['Profile Created On', u.createdAt ? fmtDate(u.createdAt) : ''],
          ]}
        />
      </Block>
      <Block title="Uploaded Documents (max 3)">
        <DocView title="KYC Verification Images" paths={Array.isArray(u.documents) ? u.documents.filter(Boolean) : []} />
      </Block>

      <Button title="Delete User" icon="trash-outline" variant="danger" loading={busy} onPress={remove} style={{ marginTop: spacing.xl }} />

      <PasswordSheet
        visible={pwOpen}
        title={`Change password for ${u.name}`}
        subtitle="This updates the user's login password immediately."
        minLength={6}
        submitLabel="Update Password"
        onClose={() => setPwOpen(false)}
        onSubmit={async ({ password }) => {
          const res = await principalPeopleApi.changeUserPassword(u.id, password);
          toast(res?.message || 'Password changed successfully');
        }}
      />
    </RefreshableScroll>
  );
}
