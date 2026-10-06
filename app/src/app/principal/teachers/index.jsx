import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import { useAsync } from '../../../lib/useAsync';
import { confirm, showError, toast } from '../../../lib/notify';
import { fmtDate } from '../../../lib/format';
import { Chip, EmptyState, ErrorView, SearchBar } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonList } from '../../../components/Skeleton';
import { spacing } from '../../../theme';
import { ActionLink, CountStrip, PersonCard, StatusPill, useDebounced } from '../../../components/principal/people/shared';

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approvals' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'ON_LEAVE', label: 'On Leave' },
  { id: 'SUSPENDED', label: 'Suspended' },
];
const isPending = (t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING';
const qualText = (t) =>
  Array.isArray(t.qualifications) ? t.qualifications.map((q) => (typeof q === 'string' ? q : q?.degree)).filter(Boolean).join(', ') : t.qualification || '';

// Web: Teacher Management (list, status filters, approve, activate/deactivate, delete).
export default function PrincipalTeachers() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const dSearch = useDebounced(search.trim());
  const state = useAsync(() => principalPeopleApi.teachers({ search: dSearch }), [dSearch], { refetchOnFocus: true });
  const all = useMemo(() => state.data?.data || [], [state.data]);

  const counts = useMemo(() => {
    const c = { ALL: all.length };
    FILTERS.forEach((f) => {
      if (f.id === 'PENDING_APPROVAL') c[f.id] = all.filter(isPending).length;
      else if (f.id !== 'ALL') c[f.id] = all.filter((t) => t.status === f.id).length;
    });
    c.assigned = all.filter((t) => (t.counts?.totalAssignments ?? 0) > 0).length;
    return c;
  }, [all]);
  const rows = useMemo(() => (filter === 'ALL' ? all : filter === 'PENDING_APPROVAL' ? all.filter(isPending) : all.filter((t) => t.status === filter)), [all, filter]);

  const run = async (fn, okMsg, errMsg) => {
    try {
      await fn();
      toast(okMsg);
      state.reload({ silent: true });
    } catch (e) {
      showError(e, errMsg);
    }
  };
  const toggle = (t) => {
    const next = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return run(() => principalPeopleApi.setTeacherStatus(t.id, next), `Teacher ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'Unable to update teacher status');
  };
  const approve = (t) => run(() => principalPeopleApi.approveEmployee(t.id), `${t.name || t.fullName} approved & activated`, 'Unable to approve teacher');
  const remove = async (t) => {
    const ok = await confirm('Delete teacher?', `"${t.name}" will be permanently removed. Teachers with class or subject assignments cannot be deleted - deactivate them instead.`, { confirmText: 'Delete', destructive: true });
    if (ok) run(() => principalPeopleApi.deleteTeacher(t.id), 'Teacher deleted', 'Unable to delete teacher');
  };

  const header = (
    <View style={{ paddingTop: spacing.md }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search employee ID, name, email, phone..." style={{ marginBottom: spacing.sm }} />
      {state.data ? (
        <CountStrip
          items={[
            { label: 'Total', value: counts.ALL },
            { label: 'Active', value: counts.ACTIVE, color: theme.success },
            { label: 'Pending', value: counts.PENDING_APPROVAL, color: theme.warning },
            { label: 'Assigned', value: counts.assigned, color: theme.primary },
          ]}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={`${f.label} (${counts[f.id] ?? 0})`} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Teachers' }} />
      {state.loading && !state.data ? (
        <View style={{ padding: spacing.lg }}>
          {header}
          <SkeletonList padded={false} />
        </View>
      ) : state.error && !state.data ? (
        <ErrorView error={state.error} onRetry={state.reload} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(t) => String(t.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await state.reload({ silent: true });
                setRefreshing(false);
              }}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="easel-outline"
              title={all.length ? 'No teachers found' : 'No teachers added yet'}
              message={all.length ? 'No teachers match the selected filter.' : 'Create teacher profiles first, then use active teachers in sections and subject assignments.'}
              action={!all.length ? <Button title="Add First Teacher" icon="add" onPress={() => router.push('/principal/teachers/form')} style={{ marginTop: spacing.md }} /> : null}
            />
          }
          renderItem={({ item: t }) => {
            const pending = isPending(t);
            return (
              <PersonCard
                photo={t.profilePhoto}
                name={t.name || t.fullName}
                lines={[
                  t.employeeId || 'No employee ID',
                  [t.email, t.phone].filter(Boolean).join(' · ') || 'No contact',
                  [qualText(t), t.joiningDate ? `Joined ${fmtDate(t.joiningDate)}` : ''].filter(Boolean).join(' · '),
                  `Assignments ${t.counts?.totalAssignments ?? 0} (CT ${t.counts?.classTeacherSections ?? 0} · Subjects ${t.counts?.subjectAssignments ?? 0})`,
                ]}
                status={<StatusPill status={t.status} />}
                onPress={() => router.push(`/principal/teachers/${t.id}`)}
                actions={
                  <>
                    {pending ? <ActionLink icon="shield-checkmark-outline" label="Approve" tone="success" onPress={() => approve(t)} /> : null}
                    <ActionLink icon="create-outline" label="Edit" onPress={() => router.push({ pathname: '/principal/teachers/form', params: { id: t.id } })} />
                    {!pending ? (
                      <ActionLink icon={t.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-circle-outline'} label={t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} tone={t.status === 'ACTIVE' ? 'warning' : 'success'} onPress={() => toggle(t)} />
                    ) : null}
                    <ActionLink icon="trash-outline" label="Delete" tone="danger" onPress={() => remove(t)} />
                  </>
                }
              />
            );
          }}
        />
      )}
      <Pressable
        onPress={() => router.push('/principal/teachers/form')}
        accessibilityRole="button"
        accessibilityLabel="Add teacher"
        style={{ position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}
      >
        <Ionicons name="add" size={28} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}
