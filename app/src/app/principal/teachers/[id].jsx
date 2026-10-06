import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalPeopleApi } from '../../../api/principal/people';
import { useAsync } from '../../../lib/useAsync';
import { confirm, showError, toast } from '../../../lib/notify';
import { fmtDate } from '../../../lib/format';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { SkeletonDetail } from '../../../components/Skeleton';
import { ErrorView } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { spacing } from '../../../theme';
import { Block, CountStrip, DocView, InfoList, PasswordSheet, ProfileHeader, StatusPill } from '../../../components/principal/people/shared';

// Web: Teacher Detail (+ set login password, approve pending teachers).
export default function PrincipalTeacherDetail() {
  const { id } = useLocalSearchParams();
  const state = useAsync(() => principalPeopleApi.teacher(id), [id], { refetchOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const t = state.data?.data;

  if (state.loading && !state.data) return <SkeletonDetail avatar />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!t) return <ErrorView error={new Error('Teacher not found')} onRetry={state.reload} />;

  const name = t.name || t.fullName;
  const pending = t.status === 'PENDING_APPROVAL' || t.status === 'PENDING';
  const docs = { aadhaar: (t.documents?.aadhaar || []).filter(Boolean), others: (t.documents?.others || []).filter(Boolean) };
  const addressText =
    typeof t.address === 'string'
      ? t.address
      : [t.address?.addressLine, t.address?.city, t.address?.state, t.address?.pincode].filter(Boolean).join(', ');
  const qualText = Array.isArray(t.qualifications)
    ? t.qualifications.map((q) => (typeof q === 'string' ? q : q?.degree)).filter(Boolean).join(', ')
    : t.qualification || '';

  const act = async (fn, okMsg, errMsg) => {
    setBusy(true);
    try {
      await fn();
      toast(okMsg);
      await state.reload({ silent: true });
    } catch (e) {
      showError(e, errMsg);
    } finally {
      setBusy(false);
    }
  };
  const toggle = () => {
    const next = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return act(() => principalPeopleApi.setTeacherStatus(t.id, next), `Teacher ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'Unable to update teacher status');
  };
  const remove = async () => {
    const ok = await confirm('Delete teacher?', `"${name}" will be permanently removed. Teachers with class or subject assignments cannot be deleted - deactivate them instead.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await principalPeopleApi.deleteTeacher(t.id);
      toast('Teacher deleted');
      router.back();
    } catch (e) {
      showError(e, 'Unable to delete teacher');
      setBusy(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <Stack.Screen options={{ title: name || 'Teacher' }} />
      <ProfileHeader
        photo={t.profilePhoto}
        name={name}
        badges={<StatusPill status={t.status} />}
        lines={[t.employeeId || 'No employee ID', t.joiningDate ? `Joined ${fmtDate(t.joiningDate)}` : '', `${t.phone || t.mobileNumber || 'No phone'} · ${t.email || 'No email'}`]}
      />
      <View style={{ height: spacing.md }} />
      <CountStrip
        items={[
          { label: 'Assignments', value: t.counts?.totalAssignments },
          { label: 'Class Teacher', value: t.counts?.classTeacherSections },
          { label: 'Subjects', value: t.counts?.subjectAssignments },
          { label: 'Documents', value: docs.aadhaar.length + docs.others.length },
        ]}
      />

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {pending ? (
          <Button title="Approve & Activate" icon="shield-checkmark-outline" loading={busy} onPress={() => act(() => principalPeopleApi.approveEmployee(t.id), `${name} approved & activated`, 'Unable to approve teacher')} />
        ) : null}
        <Button title="Edit Teacher" icon="create-outline" onPress={() => router.push({ pathname: '/principal/teachers/form', params: { id: t.id } })} />
        {!pending ? <Button title={t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} icon={t.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-circle-outline'} variant="secondary" loading={busy} onPress={toggle} /> : null}
      </View>

      <Block title="Basic Details">
        <InfoList rows={[['Full Name', name], ['Gender', t.gender], ['Date of Birth', t.dateOfBirth ? fmtDate(t.dateOfBirth) : '']]} />
      </Block>
      <Block title="Contact Details">
        <InfoList rows={[['Mobile Number', t.mobileNumber || t.phone], ['Email', t.email], ['Address', addressText]]} />
      </Block>
      <Block title="Professional Details">
        <InfoList
          rows={[
            ['Employee ID', t.employeeId],
            ['Department', t.department],
            ['Designation', t.designation],
            ['Qualification', qualText],
            ['Joining Date', t.joiningDate ? fmtDate(t.joiningDate) : ''],
            ['Experience', t.experienceSummary],
          ]}
        />
      </Block>
      <Block title="Documents">
        <DocView title="Aadhaar Card Photo" paths={docs.aadhaar} />
        <DocView title="Document" paths={docs.others} />
      </Block>
      <Block title="App Login">
        <InfoList rows={[['Login email', t.account?.loginEmail], ['Login status', t.account?.accountStatus]]} />
        <Button title="Set login password" icon="key-outline" variant="secondary" onPress={() => setPwOpen(true)} style={{ marginTop: spacing.sm }} />
      </Block>

      <Button title="Delete Teacher" icon="trash-outline" variant="danger" loading={busy} onPress={remove} style={{ marginTop: spacing.xl }} />

      <PasswordSheet
        visible={pwOpen}
        title="Set teacher password"
        subtitle={`Login for ${name} in the teacher app.`}
        askEmail
        defaultEmail={t.account?.loginEmail || t.email}
        onClose={() => setPwOpen(false)}
        onSubmit={async ({ password, loginEmail }) => {
          await principalPeopleApi.setTeacherPassword(t.id, password, loginEmail);
          toast('Teacher login password set');
          state.reload({ silent: true });
        }}
      />
    </RefreshableScroll>
  );
}
