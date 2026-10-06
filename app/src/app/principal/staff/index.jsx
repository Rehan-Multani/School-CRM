import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState, SearchBar } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonList } from '../../../components/Skeleton';
import { confirm, showError, toast } from '../../../lib/notify';
import { spacing } from '../../../theme';
import { ActionLink, CountStrip, PasswordSheet, PersonCard, StatusPill, useDebounced } from '../../../components/principal/people/shared';
import { ROLE_LABELS, ROLE_TABS, ROLE_TONES } from '../../../components/principal/people/staffRoles';

// Web: Staff & User Management (SchoolUser accounts).
export default function PrincipalStaff() {
  const theme = useTheme();
  const listRef = useRef(null);
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const dSearch = useDebounced(search.trim());

  const fetchPage = (page) =>
    principalPeopleApi
      .users({ page, limit: 20, role: role !== 'ALL' ? role : '', status: status !== 'ALL' ? status : '', search: dSearch })
      .then((res) => {
        if (page === 1 && res.stats) setStats(res.stats);
        return res;
      });

  const run = async (fn, okMsg, errMsg) => {
    try {
      const res = await fn();
      toast(typeof okMsg === 'function' ? okMsg(res) : okMsg);
      listRef.current?.reload();
    } catch (e) {
      showError(e, errMsg);
    }
  };
  const toggle = (u) => {
    const next = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return run(() => principalPeopleApi.setUserStatus(u.id, next), `${u.name} marked as ${next}`, 'Failed to toggle status');
  };
  const sendCreds = (u) => run(() => principalPeopleApi.sendUserCredentials(u.id), (r) => r?.message || `Credentials dispatched to ${u.email}`, 'Failed to send credentials email');
  const remove = async (u) => {
    const ok = await confirm('Delete staff user?', `Permanently remove "${u.name}" (${u.employeeId})? This cannot be undone.`, { confirmText: 'Delete', destructive: true });
    if (ok) run(() => principalPeopleApi.deleteUser(u.id), `User "${u.name}" deleted`, 'Failed to delete user');
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, employee ID, email, department..." style={{ marginBottom: spacing.sm }} />
      {stats ? (
        <CountStrip
          items={[
            { label: 'Staff', value: (stats.LIBRARIAN || 0) + (stats.HR || 0) + (stats.ACCOUNTANT || 0) + (stats.TRANSPORT || 0) },
            { label: 'Active', value: stats.active || 0, color: theme.success },
            { label: 'HR & Accts', value: (stats.HR || 0) + (stats.ACCOUNTANT || 0) },
            { label: 'Lib & Trans', value: (stats.LIBRARIAN || 0) + (stats.TRANSPORT || 0) },
          ]}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
        {ROLE_TABS.map((t) => (
          <Chip key={t.id} label={t.label} active={role === t.id} onPress={() => setRole(t.id)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        {[
          ['ALL', 'All statuses'],
          ['ACTIVE', 'Active'],
          ['INACTIVE', 'Inactive'],
        ].map(([v, l]) => (
          <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Staff' }} />
      {header}
      <PagedList
        ref={listRef}
        fetchPage={fetchPage}
        deps={[role, status, dSearch]}
        skeleton={<SkeletonList padded={false} />}
        renderItem={({ item: u }) => (
          <PersonCard
            photo={u.photo}
            name={u.name}
            lines={[u.email, `${u.employeeId || ''}${u.department ? ` · ${u.department}` : ''}${u.designation ? ` · ${u.designation}` : ''}`, u.phone]}
            extra={<Badge label={ROLE_LABELS[u.role] || u.role} tone={ROLE_TONES[u.role] || 'primary'} />}
            status={<StatusPill status={u.status} />}
            onPress={() => router.push(`/principal/staff/${u.id}`)}
            actions={
              <>
                <ActionLink icon="create-outline" label="Edit" onPress={() => router.push({ pathname: '/principal/staff/form', params: { id: u.id } })} />
                <ActionLink icon="key-outline" label="Password" tone="warning" onPress={() => setPwUser(u)} />
                <ActionLink icon="send-outline" label="Send login" onPress={() => sendCreds(u)} />
                <ActionLink icon="power-outline" label={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} tone={u.status === 'ACTIVE' ? 'warning' : 'success'} onPress={() => toggle(u)} />
                <ActionLink icon="trash-outline" label="Delete" tone="danger" onPress={() => remove(u)} />
              </>
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No staff users found"
            message={dSearch || role !== 'ALL' || status !== 'ALL' ? 'Try adjusting your search or role filters.' : 'Get started by creating your first school staff profile.'}
            action={<Button title="Add Staff Member" icon="add" onPress={() => router.push('/principal/staff/form')} style={{ marginTop: spacing.md }} />}
          />
        }
      />
      <Pressable
        onPress={() => router.push({ pathname: '/principal/staff/form', params: role !== 'ALL' ? { role } : {} })}
        accessibilityRole="button"
        accessibilityLabel="Add staff member"
        style={{ position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}
      >
        <Ionicons name="add" size={28} color={theme.onPrimary} />
      </Pressable>

      <PasswordSheet
        visible={Boolean(pwUser)}
        title={`Change password${pwUser ? ` for ${pwUser.name}` : ''}`}
        subtitle={pwUser ? `Login password for ${pwUser.email} will be updated immediately.` : ''}
        minLength={6}
        submitLabel="Update Password"
        onClose={() => setPwUser(null)}
        onSubmit={async ({ password }) => {
          const res = await principalPeopleApi.changeUserPassword(pwUser.id, password);
          toast(res?.message || 'Password changed successfully');
        }}
      />
    </View>
  );
}
