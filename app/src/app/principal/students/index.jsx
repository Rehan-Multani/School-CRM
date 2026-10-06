import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { principalPeopleApi } from '../../../api/principal/people';
import PagedList from '../../../components/PagedList';
import { Chip, EmptyState, SearchBar, Select } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { SkeletonList } from '../../../components/Skeleton';
import { confirm, showError, toast } from '../../../lib/notify';
import { spacing } from '../../../theme';
import {
  ActionLink,
  CountStrip,
  PersonCard,
  StatusPill,
  personName,
  useAcademicRefs,
  useDebounced,
} from '../../../components/principal/people/shared';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

// Web: Student Management (list, filters, activate/deactivate, delete).
export default function PrincipalStudents() {
  const theme = useTheme();
  const listRef = useRef(null);
  const refs = useAcademicRefs();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const dSearch = useDebounced(search.trim());

  const classOptions = [{ value: '', label: 'All classes' }, ...refs.classesForYear(yearId, classId).map((c) => ({ value: c.id, label: c.name }))];
  const sectionOptions = [{ value: '', label: 'All sections' }, ...refs.sectionsFor(yearId, classId).map((s) => ({ value: s.id, label: s.name }))];
  const yearOptions = [{ value: '', label: 'All academic years' }, ...refs.years.map((y) => ({ value: y.id, label: y.name }))];
  const activeFilters = [yearId, classId, sectionId].filter(Boolean).length;

  const fetchPage = (page) =>
    principalPeopleApi
      .students({ page, limit: 20, search: dSearch, status, academicYearId: yearId, classId, sectionId })
      .then((res) => {
        if (page === 1) setStats(res.stats || null);
        return res;
      });

  const toggle = async (s) => {
    const next = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await principalPeopleApi.setStudentStatus(s.id, next);
      toast(`Student ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      listRef.current?.reload();
    } catch (e) {
      showError(e, 'Unable to update status');
    }
  };

  const remove = async (s) => {
    const ok = await confirm('Delete student?', `Delete ${personName(s)}? This removes the student record and enrollment history.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await principalPeopleApi.deleteStudent(s.id);
      toast('Student deleted');
      listRef.current?.reload();
    } catch (e) {
      showError(e, 'Unable to delete student');
    }
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, admission no, parent, email..." style={{ marginBottom: spacing.sm }} />
      {stats ? (
        <CountStrip
          items={[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.active, color: theme.success },
            { label: 'Inactive', value: stats.inactive },
            { label: 'Withdrawn', value: stats.withdrawn, color: theme.warning },
          ]}
        />
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }}>
        {STATUSES.map((s) => (
          <Chip key={s.value || 'all'} label={s.label} active={status === s.value} onPress={() => setStatus(s.value)} />
        ))}
        <Pressable onPress={() => setShowFilters((v) => !v)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Ionicons name="options-outline" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Filters{activeFilters ? ` (${activeFilters})` : ''}</Text>
        </Pressable>
      </View>
      {showFilters ? (
        <View>
          <Select
            label="Academic year"
            value={yearId}
            options={yearOptions}
            onChange={(v) => {
              setYearId(v);
              setClassId('');
              setSectionId('');
              refs.loadYearClasses(v);
            }}
          />
          <Select
            label="Class"
            value={classId}
            options={classOptions}
            onChange={(v) => {
              setClassId(v);
              setSectionId('');
            }}
          />
          <Select label="Section" value={sectionId} options={sectionOptions} onChange={setSectionId} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Students' }} />
      {header}
      <PagedList
        ref={listRef}
        fetchPage={fetchPage}
        deps={[dSearch, status, yearId, classId, sectionId]}
        skeleton={<SkeletonList padded={false} />}
        renderItem={({ item: s }) => {
          const e = s.enrollment;
          return (
            <PersonCard
              photo={s.photo}
              name={personName(s)}
              lines={[
                s.admissionNumber ? `Adm. ${s.admissionNumber}` : '',
                `${e?.class?.name || '-'} / ${e?.section?.name || '-'}${e?.academicYear?.name ? ` · ${e.academicYear.name}` : ''}`,
                s.parentName ? `${s.parentName}${s.parentPhone ? ` · ${s.parentPhone}` : ''}` : s.parentPhone || '',
              ]}
              status={<StatusPill status={s.status} />}
              onPress={() => router.push(`/principal/students/${s.id}`)}
              actions={
                <>
                  <ActionLink icon="create-outline" label="Edit" onPress={() => router.push({ pathname: '/principal/students/form', params: { id: s.id } })} />
                  <ActionLink icon={s.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-circle-outline'} label={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} tone={s.status === 'ACTIVE' ? 'warning' : 'success'} onPress={() => toggle(s)} />
                  <ActionLink icon="trash-outline" label="Delete" tone="danger" onPress={() => remove(s)} />
                </>
              }
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="school-outline"
            title="No students found"
            message={dSearch || status || activeFilters ? 'No students match the current filters.' : 'Start by adding a student and mapping them to a class and section.'}
            action={<Button title="Add Student" icon="add" onPress={() => router.push('/principal/students/form')} style={{ marginTop: spacing.md }} />}
          />
        }
      />
      <Pressable
        onPress={() => router.push('/principal/students/form')}
        accessibilityRole="button"
        accessibilityLabel="Add student"
        style={{ position: 'absolute', right: spacing.lg, bottom: spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}
      >
        <Ionicons name="add" size={28} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}
