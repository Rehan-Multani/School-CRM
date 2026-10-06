import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from '../../../../lib/notify';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { AsyncView, Avatar, EmptyState, Select } from '../../../../components/kit';
import { Card, Input } from '../../../../components/ui';
import { SkeletonCards } from '../../../../components/Skeleton';
import { ActionPill, CountGrid, FilterChips, Meta, useShowMore } from '../../../../components/principal/academics/kit';
import { act } from '../../../../components/principal/academics/helpers';
import { font, spacing } from '../../../../theme';

const ALL = 'ALL';

// Class teacher (mentor) of every section. A teacher can be class teacher of only one section.
export default function ClassTeachersScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [yearF, setYearF] = useState(ALL);
  const [classF, setClassF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [busyId, setBusyId] = useState(null);

  const state = useAsync(
    async () => {
      const [years, classes, sections, teachers] = await Promise.all([
        api.years({ limit: 100 }),
        api.classes({ limit: 100 }),
        api.sections({ limit: 1000 }),
        api.teachers({ limit: 1000 }),
      ]);
      return {
        years,
        classes: classes.filter((c) => c.status === 'ACTIVE'),
        sections: sections.filter((s) => s.status === 'ACTIVE'),
        teachers: teachers.filter((t) => t.status === 'ACTIVE'),
      };
    },
    [],
    { refetchOnFocus: true },
  );
  const d = state.data;

  const maps = useMemo(() => {
    if (!d) return null;
    const m = (arr) => new Map(arr.map((x) => [x.id, x]));
    return { cls: m(d.classes), teacher: m(d.teachers), year: m(d.years) };
  }, [d]);

  const filtered = useMemo(() => {
    if (!d) return [];
    const q = search.trim().toLowerCase();
    return d.sections.filter((s) => {
      if (yearF !== ALL && s.academicYearId !== yearF) return false;
      if (classF !== ALL && s.classId !== classF) return false;
      if (statusF === 'ASSIGNED' && !s.classTeacherId) return false;
      if (statusF === 'VACANT' && s.classTeacherId) return false;
      if (!q) return true;
      const tch = s.classTeacherId ? maps.teacher.get(s.classTeacherId) : null;
      return [maps.cls.get(s.classId)?.name, s.name, s.roomNumber, tch?.name, tch?.department, tch?.email, maps.year.get(s.academicYearId)?.name]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
        .includes(q);
    });
  }, [d, maps, search, yearF, classF, statusF]);

  // Group by class for display.
  const groups = useMemo(() => {
    const byClass = new Map();
    filtered.forEach((s) => {
      if (!byClass.has(s.classId)) byClass.set(s.classId, []);
      byClass.get(s.classId).push(s);
    });
    return Array.from(byClass.entries());
  }, [filtered]);
  const { visible, more } = useShowMore(groups, 8);

  const hasFilters = Boolean(search) || yearF !== ALL || classF !== ALL || statusF !== ALL;

  const change = async (section, teacherId) => {
    if (teacherId) {
      const other = d.sections.find((s) => s.id !== section.id && s.classTeacherId === teacherId);
      if (other) {
        return toast.error(`Already class teacher of ${maps.cls.get(other.classId)?.name || 'another class'} - ${other.name}`);
      }
    }
    setBusyId(section.id);
    const ok = await act(() => api.updateSection(section.id, { classTeacherId: teacherId || null }), teacherId ? 'Class teacher assigned successfully' : 'Class teacher unassigned');
    setBusyId(null);
    if (ok) state.reload({ silent: true });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Class Teachers' }} />
      <RefreshableScroll onRefresh={() => state.reload()} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <AsyncView state={state} skeleton={<SkeletonCards padded={false} />}>
          {(data) => {
            const assigned = data.sections.filter((s) => s.classTeacherId).length;
            const total = data.sections.length;
            return (
              <>
                <Text style={{ color: theme.textMuted, fontSize: font.sm, marginBottom: spacing.md }}>
                  Assign a primary class teacher (mentor) to each section.
                </Text>
                <CountGrid
                  items={[
                    { label: 'Total sections', value: total },
                    { label: 'Mentors assigned', value: assigned },
                    { label: 'Vacant sections', value: total - assigned },
                    { label: 'Total capacity', value: data.sections.reduce((a, s) => a + (Number(s.capacity) || 0), 0) },
                  ]}
                />

                <Input icon="search-outline" placeholder="Search class, section, room, teacher..." value={search} onChangeText={setSearch} style={{ marginBottom: spacing.sm }} />
                <FilterChips
                  value={statusF}
                  onChange={setStatusF}
                  options={[
                    { value: ALL, label: 'All sections', count: total },
                    { value: 'ASSIGNED', label: 'Assigned', count: assigned },
                    { value: 'VACANT', label: 'Vacant', count: total - assigned },
                  ]}
                />
                <Select
                  label="Academic year"
                  value={yearF}
                  onChange={setYearF}
                  options={[{ value: ALL, label: 'All academic years' }, ...data.years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))]}
                />
                <Select label="Class" value={classF} onChange={setClassF} options={[{ value: ALL, label: 'All classes' }, ...data.classes.map((c) => ({ value: c.id, label: c.name }))]} />
                {hasFilters ? (
                  <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
                    <ActionPill
                      icon="refresh-outline"
                      label="Reset filters"
                      tone="danger"
                      onPress={() => {
                        setSearch('');
                        setYearF(ALL);
                        setClassF(ALL);
                        setStatusF(ALL);
                      }}
                    />
                  </View>
                ) : null}

                {!total ? (
                  <EmptyState icon="person-circle-outline" title="No sections yet" message="Create sections under an academic year first." />
                ) : !filtered.length ? (
                  <EmptyState icon="funnel-outline" title="No sections match" />
                ) : (
                  visible.map(([classId, secs]) => (
                    <View key={classId} style={{ marginTop: spacing.md }}>
                      <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>
                        {maps.cls.get(classId)?.name || 'Class'} ({secs.length} section{secs.length > 1 ? 's' : ''})
                      </Text>
                      {secs.map((sec) => {
                        const tch = sec.classTeacherId ? maps.teacher.get(sec.classTeacherId) : null;
                        return (
                          <Card key={sec.id} style={{ marginTop: spacing.sm }}>
                            <Text style={{ fontSize: font.md, fontWeight: '800', color: theme.text }}>
                              {maps.cls.get(sec.classId)?.name || 'Class'} - Section {sec.name}
                            </Text>
                            <Meta>
                              {maps.year.get(sec.academicYearId)?.name || '-'}, room {sec.roomNumber || '-'}, {sec.capacity || 40} students
                            </Meta>
                            {tch ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
                                <Avatar name={tch.name} size={36} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: theme.text, fontWeight: '700' }}>{tch.name}</Text>
                                  <Text style={{ color: theme.textMuted, fontSize: font.sm }}>
                                    {tch.department || 'Faculty'}
                                    {tch.email ? ` | ${tch.email}` : ''}
                                  </Text>
                                </View>
                              </View>
                            ) : null}
                            <View style={{ marginTop: spacing.md }}>
                              <Select
                                label={tch ? 'Reassign mentor' : 'Assign class teacher mentor'}
                                value={sec.classTeacherId || ''}
                                onChange={(v) => change(sec, v)}
                                disabled={busyId === sec.id}
                                placeholder="No class teacher (vacant)"
                                options={[
                                  { value: '', label: 'No class teacher (vacant)' },
                                  ...data.teachers.map((t) => {
                                    const other = data.sections.find((s) => s.id !== sec.id && s.classTeacherId === t.id);
                                    return {
                                      value: t.id,
                                      label: `${t.name} (${t.department || 'Faculty'})`,
                                      sub: other ? `Already assigned: ${maps.cls.get(other.classId)?.name || 'class'} - ${other.name}` : undefined,
                                    };
                                  }),
                                ]}
                              />
                            </View>
                          </Card>
                        );
                      })}
                    </View>
                  ))
                )}
                {more ? <View style={{ marginTop: spacing.md }}>{more}</View> : null}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    </>
  );
}
