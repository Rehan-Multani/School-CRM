import { Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../../api/principal/academics';
import { useAsync } from '../../../../../lib/useAsync';
import { useTheme } from '../../../../../context/ThemeContext';
import { fmtDate } from '../../../../../lib/format';
import RefreshableScroll from '../../../../../components/RefreshableScroll';
import { AsyncView, Badge, EmptyState, SectionTitle } from '../../../../../components/kit';
import { Button, Card } from '../../../../../components/ui';
import { SkeletonDetail } from '../../../../../components/Skeleton';
import { ActionPill, ActionRow, CountGrid, Meta, StatusBadge, YEAR_TONE } from '../../../../../components/principal/academics/kit';
import { actConfirmed, deleteYear, runYearAction, yearActions } from '../../../../../components/principal/academics/helpers';
import { font, spacing } from '../../../../../theme';

// One academic year: lifecycle actions, mapped classes, and each class's sections.
export default function YearDetail() {
  const { yearId } = useLocalSearchParams();
  const theme = useTheme();
  const state = useAsync(
    async () => {
      const [year, yearClasses, sections] = await Promise.all([
        api.getYear(yearId),
        api.yearClasses(yearId),
        api.sections({ academicYearId: yearId, limit: 1000 }),
      ]);
      return { year, yearClasses, sections };
    },
    [yearId],
    { refetchOnFocus: true },
  );
  const reload = () => state.reload({ silent: true });

  return (
    <>
      <Stack.Screen options={{ title: state.data?.year?.name || 'Academic Year' }} />
      <RefreshableScroll onRefresh={() => state.reload()} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <AsyncView state={state} skeleton={<SkeletonDetail rows={6} padded={false} />}>
          {({ year, yearClasses, sections }) => {
            if (!year) return <EmptyState icon="calendar-outline" title="Academic year not found" message="This session does not exist or has been removed." />;
            const sum = (k) => yearClasses.reduce((acc, c) => acc + (c.counts?.[k] || 0), 0);
            return (
              <>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ flex: 1, fontSize: font.xl, fontWeight: '800', color: theme.text }}>{year.name}</Text>
                    <Badge label={year.isCurrent ? 'Current session' : year.status} tone={year.isCurrent ? 'success' : YEAR_TONE[year.status] || 'muted'} />
                  </View>
                  <Meta>
                    {fmtDate(year.startDate)} - {fmtDate(year.endDate)}
                  </Meta>
                  <Meta>Code: {year.code || '-'}</Meta>
                  <ActionRow>
                    <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/years/form', params: { id: year.id } })} />
                    {yearActions(year).map((a) => (
                      <ActionPill key={a.key} icon={a.icon} label={a.label} tone={a.tone} onPress={async () => (await runYearAction(year, a)) && reload()} />
                    ))}
                    <ActionPill icon="trash-outline" label="Delete" tone="danger" onPress={async () => (await deleteYear(year)) && router.back()} />
                  </ActionRow>
                </Card>

                <View style={{ height: spacing.lg }} />
                <CountGrid
                  items={[
                    { label: 'Classes mapped', value: yearClasses.length },
                    { label: 'Total sections', value: sum('sections') },
                    { label: 'Enrolled students', value: sum('students') },
                    { label: 'Subject mappings', value: sum('subjectAssignments') },
                  ]}
                />

                <Button title="Add class to this year" icon="add-circle-outline" onPress={() => router.push(`/principal/academics/years/${yearId}/add-class`)} />

                {!yearClasses.length ? (
                  <EmptyState
                    icon="layers-outline"
                    title="No classes mapped to this year"
                    message="Add classes from your school master list to start creating sections and mapping curriculum."
                  />
                ) : (
                  yearClasses.map((item) => {
                    const secs = sections.filter((s) => s.classId === item.classId);
                    return (
                      <View key={item.id} style={{ marginTop: spacing.lg }}>
                        <SectionTitle
                          title={item.class?.name || 'Class'}
                          right={
                            <ActionPill
                              icon="trash-outline"
                              label="Remove"
                              tone="danger"
                              onPress={async () => {
                                const ok = await actConfirmed(
                                  { title: 'Remove class mapping', message: `Remove class "${item.class?.name}" and its sections from this academic year?`, confirmText: 'Remove' },
                                  () => api.removeClassFromYear(yearId, item.classId),
                                  'Class removed from academic year',
                                );
                                if (ok) reload();
                              }}
                            />
                          }
                        />
                        <Meta>
                          {item.counts?.sections ?? 0} sections, {item.counts?.students ?? 0} students, {item.counts?.subjectAssignments ?? 0} subject assignments
                        </Meta>
                        <Card style={{ marginTop: spacing.sm }}>
                          {!secs.length ? <Text style={{ color: theme.textMuted, fontSize: font.sm }}>No sections added yet.</Text> : null}
                          {secs.map((s, i) => (
                            <View key={s.id} style={{ paddingVertical: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: theme.border }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>{s.name}</Text>
                                <StatusBadge status={s.status || 'ACTIVE'} />
                              </View>
                              <Meta>Class teacher: {s.classTeacher?.name || 'Unassigned'}</Meta>
                              <Meta>
                                Room {s.roomNumber || '-'}, capacity {s.capacity || 40}, {s.counts?.students ?? 0} students, {s.counts?.subjects ?? 0} subjects
                              </Meta>
                              <ActionRow>
                                <ActionPill icon="eye-outline" label="Open" onPress={() => router.push(`/principal/academics/years/${yearId}/sections/${s.id}`)} />
                                <ActionPill
                                  icon="create-outline"
                                  label="Edit"
                                  tone="muted"
                                  onPress={() => router.push({ pathname: `/principal/academics/years/${yearId}/section-form`, params: { sectionId: s.id, classId: item.classId, className: item.class?.name || '' } })}
                                />
                                <ActionPill
                                  icon="trash-outline"
                                  label="Delete"
                                  tone="danger"
                                  onPress={async () => {
                                    const ok = await actConfirmed(
                                      { title: 'Delete section', message: `Are you sure you want to delete "${s.name}"?`, confirmText: 'Delete' },
                                      () => api.deleteSection(s.id),
                                      'Section deleted successfully',
                                    );
                                    if (ok) reload();
                                  }}
                                />
                              </ActionRow>
                            </View>
                          ))}
                          <Button
                            title="Add section"
                            icon="add-outline"
                            variant="outline"
                            style={{ marginTop: secs.length ? spacing.sm : spacing.md }}
                            onPress={() => router.push({ pathname: `/principal/academics/years/${yearId}/section-form`, params: { classId: item.classId, className: item.class?.name || '' } })}
                          />
                        </Card>
                      </View>
                    );
                  })
                )}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    </>
  );
}
