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
import ParentLoginSheet from '../../../components/principal/people/ParentLoginSheet';
import {
  Block,
  CountStrip,
  DocView,
  InfoList,
  PasswordSheet,
  ProfileHeader,
  StatusPill,
  personName,
} from '../../../components/principal/people/shared';

// Web: Student Detail (profile, placement, documents, status, delete) plus the
// student / parent app-login provisioning.
export default function PrincipalStudentDetail() {
  const { id } = useLocalSearchParams();
  const state = useAsync(() => principalPeopleApi.student(id), [id], { refetchOnFocus: true });
  const [busy, setBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const s = state.data?.data;

  if (state.loading && !state.data) return <SkeletonDetail avatar />;
  if (state.error && !state.data) return <ErrorView error={state.error} onRetry={state.reload} />;
  if (!s) return <ErrorView error={new Error('Student not found')} onRetry={state.reload} />;

  const e = s.enrollment;
  const docs = {
    aadhaar: (s.documents?.aadhaar || []).filter(Boolean),
    marksheet: (s.documents?.marksheet || []).filter(Boolean),
  };
  const name = personName(s);

  const toggle = async () => {
    const next = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setBusy(true);
    try {
      await principalPeopleApi.setStudentStatus(s.id, next);
      toast(`Student ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      await state.reload({ silent: true });
    } catch (err) {
      showError(err, 'Unable to update status');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm('Delete student?', `"${name}" will be permanently removed. This cannot be undone.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    setBusy(true);
    try {
      await principalPeopleApi.deleteStudent(s.id);
      toast('Student deleted');
      router.back();
    } catch (err) {
      showError(err, 'Unable to delete student');
      setBusy(false);
    }
  };

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <Stack.Screen options={{ title: name }} />
      <ProfileHeader
        photo={s.photo}
        name={name}
        badges={
          <>
            <StatusPill status={s.status} />
            {e?.status && e.status !== 'ACTIVE' ? <StatusPill status={e.status} /> : null}
            {s.account?.accountStatus ? <Badge label={`Login ${s.account.accountStatus.toLowerCase()}`} tone={s.account.accountStatus === 'ACTIVE' ? 'success' : 'muted'} /> : null}
          </>
        }
        lines={[`Admission ID: ${s.admissionNumber}`, `Class ${e?.class?.name || '-'} · Section ${e?.section?.name || '-'}`, `Roll No ${e?.rollNumber || '-'} · Parent: ${s.parentName || '-'} (${s.parentPhone || '-'})`]}
      />

      <View style={{ height: spacing.md }} />
      <CountStrip
        items={[
          { label: 'Roll No', value: e?.rollNumber || '-' },
          { label: 'Year', value: e?.academicYear?.name || '-' },
          { label: 'Documents', value: docs.aadhaar.length + docs.marksheet.length },
        ]}
      />

      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Button title="Edit Student" icon="create-outline" onPress={() => router.push({ pathname: '/principal/students/form', params: { id: s.id } })} />
        <Button title={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} icon={s.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-circle-outline'} variant="secondary" loading={busy} onPress={toggle} />
      </View>

      <Block title="Basic Details">
        <InfoList
          rows={[
            ['Full Name', name],
            ['Gender', s.gender],
            ['Date of Birth', s.dateOfBirth ? fmtDate(s.dateOfBirth) : ''],
            ['Student Email', s.email],
            ['Student Phone', s.phone],
          ]}
        />
      </Block>

      <Block title="Contact Details">
        <InfoList rows={[['Parent / Guardian', s.parentName], ['Guardian Contact', s.parentPhone], ['Residential Address', s.address]]} />
      </Block>

      <Block title="Academic Placement">
        <InfoList
          rows={[
            ['Academic Session', e?.academicYear?.name],
            ['Class Standard', e?.class?.name],
            ['Assigned Section', e?.section?.name],
            ['Admission Number', s.admissionNumber],
            ['Enrollment Date', e?.enrollmentDate ? fmtDate(e.enrollmentDate) : ''],
          ]}
        />
      </Block>

      <Block title="Documents">
        <DocView title="Aadhaar Card Photo" paths={docs.aadhaar} />
        <DocView title="Previous Year's Marksheet" paths={docs.marksheet} />
      </Block>

      <Block title="App Login">
        <InfoList
          rows={[
            ['Student login email', s.account?.loginEmail],
            ['Login status', s.account?.accountStatus],
            ['Last login', s.lastLoginAt ? fmtDate(s.lastLoginAt) : ''],
          ]}
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title="Set student password" icon="key-outline" variant="secondary" onPress={() => setPwOpen(true)} />
          <Button title="Create parent login" icon="people-outline" variant="secondary" onPress={() => setParentOpen(true)} />
        </View>
      </Block>

      <Button title="Delete Student" icon="trash-outline" variant="danger" loading={busy} onPress={remove} style={{ marginTop: spacing.xl }} />

      <PasswordSheet
        visible={pwOpen}
        title="Set student password"
        subtitle={`Login for ${name} in the student app.`}
        askEmail
        defaultEmail={s.account?.loginEmail || s.email}
        onClose={() => setPwOpen(false)}
        onSubmit={async ({ password, loginEmail }) => {
          await principalPeopleApi.setStudentPassword(s.id, password, loginEmail);
          toast('Student login password set');
          state.reload({ silent: true });
        }}
      />
      <ParentLoginSheet visible={parentOpen} student={{ ...s, name }} onClose={() => setParentOpen(false)} onDone={() => state.reload({ silent: true })} />
    </RefreshableScroll>
  );
}
