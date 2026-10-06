import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../../../api/principal/academics';
import { useAsync } from '../../../../../../lib/useAsync';
import { useTheme } from '../../../../../../context/ThemeContext';
import RefreshableScroll from '../../../../../../components/RefreshableScroll';
import { AsyncView, EmptyState, Select, SectionTitle } from '../../../../../../components/kit';
import { Button, Card } from '../../../../../../components/ui';
import { SkeletonDetail } from '../../../../../../components/Skeleton';
import { ActionPill, CountGrid, FilterChips, Meta, StatusBadge, teacherLabel } from '../../../../../../components/principal/academics/kit';
import { act, actConfirmed } from '../../../../../../components/principal/academics/helpers';
import { font, spacing } from '../../../../../../theme';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'subjects', label: 'Subjects' },
  { value: 'teacher', label: 'Class Teacher' },
];

// Section detail: overview counts, the subjects taught (with teachers), class teacher.
export default function SectionDetail() {
  const { yearId, sectionId } = useLocalSearchParams();
  const theme = useTheme();
  const [tab, setTab] = useState('overview');
  const [teacherId, setTeacherId] = useState(null);
  const [saving, setSaving] = useState(false);
  const state = useAsync(
    async () => {
      const [section, sectionSubjects, teachers] = await Promise.all([
        api.getSection(sectionId),
        api.sectionSubjects(sectionId),
        api.teachers({ status: 'ACTIVE', limit: 1000 }),
      ]);
      return { section, sectionSubjects, teachers };
    },
    [sectionId],
    { refetchOnFocus: true },
  );
  const reload = () => state.reload({ silent: true });

  const title = state.data?.section ? `${state.data.section.class?.name || 'Class'} - Section ${state.data.section.name}` : 'Section';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <RefreshableScroll onRefresh={() => state.reload()} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <AsyncView state={state} skeleton={<SkeletonDetail rows={5} padded={false} />}>
          {({ section, sectionSubjects, teachers }) => {
            if (!section) return <EmptyState icon="school-outline" title="Section not found" />;
            const current = teacherId ?? (section.classTeacherId || section.classTeacher?.id || '');
            return (
              <>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={{ flex: 1, fontSize: font.xl, fontWeight: '800', color: theme.text }}>{title}</Text>
                    <StatusBadge status={section.status} />
                  </View>
                  <Meta>
                    {section.academicYear?.name || 'Academic year'}, room {section.roomNumber || '-'}, capacity {section.capacity}
                  </Meta>
                  <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
                    <ActionPill
                      icon="create-outline"
                      label="Edit section"
                      tone="muted"
                      onPress={() =>
                        router.push({
                          pathname: `/principal/academics/years/${yearId}/section-form`,
                          params: { sectionId: section.id, classId: section.classId, className: section.class?.name || '' },
                        })
                      }
                    />
                  </View>
                </Card>

                <View style={{ height: spacing.md }} />
                <FilterChips options={TABS} value={tab} onChange={setTab} />
                <View style={{ height: spacing.sm }} />

                {tab === 'overview' ? (
                  <CountGrid
                    items={[
                      { label: 'Capacity', value: section.counts?.capacity ?? section.capacity },
                      { label: 'Students', value: section.counts?.students },
                      { label: 'Subjects', value: section.counts?.subjects ?? sectionSubjects.length },
                      { label: 'Class teacher', value: section.classTeacher?.name || '-' },
                    ]}
                  />
                ) : null}

                {tab === 'subjects' ? (
                  <>
                    <SectionTitle title={`Section ${section.name} subjects`} />
                    <Button
                      title="Add subject"
                      icon="add-circle-outline"
                      onPress={() =>
                        router.push({
                          pathname: '/principal/academics/subject-assignments/form',
                          params: { sectionId: section.id, yearId: section.academicYearId || yearId, classId: section.classId },
                        })
                      }
                    />
                    {!sectionSubjects.length ? (
                      <EmptyState icon="book-outline" title="No subjects assigned" message="Assign subjects and teachers for this section." />
                    ) : (
                      sectionSubjects.map((item) => (
                        <Card key={item.id} style={{ marginTop: spacing.md }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                            <Text style={{ flex: 1, fontSize: font.lg, fontWeight: '800', color: theme.text }}>{item.subject?.name}</Text>
                            <StatusBadge status={item.status || 'ACTIVE'} />
                          </View>
                          <Meta>Teacher: {item.teacher?.name || '-'}</Meta>
                          <Meta>Type: {item.subject?.subjectType || 'THEORY'}</Meta>
                          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                            <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/subject-assignments/form', params: { id: item.id } })} />
                            <ActionPill
                              icon="trash-outline"
                              label="Remove"
                              tone="danger"
                              onPress={async () => {
                                const ok = await actConfirmed(
                                  { title: 'Remove subject', message: `Remove subject "${item.subject?.name}" from the section?`, confirmText: 'Remove' },
                                  () => api.deleteSectionSubject(item.id),
                                  'Subject removed',
                                );
                                if (ok) reload();
                              }}
                            />
                          </View>
                        </Card>
                      ))
                    )}
                  </>
                ) : null}

                {tab === 'teacher' ? (
                  <Card>
                    <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text }}>Class teacher</Text>
                    <Text style={{ color: theme.textMuted, marginTop: spacing.sm, marginBottom: spacing.md }}>
                      {section.classTeacher?.name || 'No class teacher assigned yet.'}
                    </Text>
                    <Select
                      label="Assign class teacher"
                      value={current}
                      onChange={setTeacherId}
                      options={[{ value: '', label: 'No class teacher (vacant)' }, ...teachers.map((t) => ({ value: t.id, label: teacherLabel(t) }))]}
                    />
                    <Button
                      title="Save class teacher"
                      icon="checkmark-circle-outline"
                      loading={saving}
                      loadingTitle="Saving..."
                      disabled={teacherId == null}
                      onPress={async () => {
                        setSaving(true);
                        const ok = await act(() => api.updateSection(section.id, { classTeacherId: teacherId || null }), teacherId ? 'Class teacher assigned successfully' : 'Class teacher unassigned');
                        setSaving(false);
                        if (ok) {
                          setTeacherId(null);
                          reload();
                        }
                      }}
                    />
                  </Card>
                ) : null}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    </>
  );
}
