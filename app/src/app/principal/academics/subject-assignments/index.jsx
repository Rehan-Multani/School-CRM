import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast, showError } from '../../../../lib/notify';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { AsyncView, Badge, EmptyState, Select } from '../../../../components/kit';
import { Button, Card, Input } from '../../../../components/ui';
import { SkeletonCards } from '../../../../components/Skeleton';
import { ActionPill, ActionRow, CountGrid, FilterChips, Meta, StatusBadge, teacherLabel, useShowMore } from '../../../../components/principal/academics/kit';
import { act, actConfirmed, importEach, importSummary } from '../../../../components/principal/academics/helpers';
import { SAMPLES, csvEscape, parseAssignments, pickCsvText, shareCsv } from '../../../../components/principal/academics/csv';
import { font, spacing } from '../../../../theme';

const ALL = 'ALL';

export default function SubjectAssignmentsScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [yearF, setYearF] = useState(ALL);
  const [classF, setClassF] = useState(ALL);
  const [sectionF, setSectionF] = useState(ALL);
  const [teacherF, setTeacherF] = useState(ALL);
  const [subjectF, setSubjectF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [showFilters, setShowFilters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const state = useAsync(
    async () => {
      const [years, classes, sections, subjects, teachers, assignments] = await Promise.all([
        api.years({ limit: 100 }),
        api.classes({ limit: 100 }),
        api.sections({ limit: 1000 }),
        api.subjects({ limit: 1000 }),
        api.teachers({ limit: 1000 }),
        api.allSectionSubjects(),
      ]);
      return {
        years,
        classes: classes.filter((c) => c.status === 'ACTIVE'),
        sections: sections.filter((s) => s.status === 'ACTIVE'),
        subjects: subjects.filter((s) => s.status === 'ACTIVE'),
        teachers: teachers.filter((t) => t.status === 'ACTIVE'),
        assignments,
      };
    },
    [],
    { refetchOnFocus: true },
  );
  const d = state.data;
  const reload = () => state.reload({ silent: true });

  const maps = useMemo(() => {
    if (!d) return null;
    const m = (arr) => new Map(arr.map((x) => [x.id, x]));
    return { subject: m(d.subjects), teacher: m(d.teachers), cls: m(d.classes), section: m(d.sections), year: m(d.years) };
  }, [d]);

  const filtered = useMemo(() => {
    if (!d) return [];
    const q = search.trim().toLowerCase();
    return d.assignments.filter((it) => {
      if (yearF !== ALL && it.academicYearId !== yearF) return false;
      if (classF !== ALL && it.classId !== classF) return false;
      if (sectionF !== ALL && it.sectionId !== sectionF) return false;
      if (subjectF !== ALL && it.subjectId !== subjectF) return false;
      if (statusF !== ALL && (it.status || 'ACTIVE') !== statusF) return false;
      if (teacherF === 'ASSIGNED' && !it.teacherId) return false;
      if (teacherF === 'VACANT' && it.teacherId) return false;
      if (teacherF !== ALL && teacherF !== 'ASSIGNED' && teacherF !== 'VACANT' && it.teacherId !== teacherF) return false;
      if (!q) return true;
      const sub = it.subject || maps.subject.get(it.subjectId);
      const tch = it.teacher || maps.teacher.get(it.teacherId);
      const hay = [
        sub?.name,
        sub?.code,
        it.class?.name || maps.cls.get(it.classId)?.name,
        it.section?.name || maps.section.get(it.sectionId)?.name,
        tch?.name,
        tch?.department,
        tch?.email,
        it.academicYear?.name || maps.year.get(it.academicYearId)?.name,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [d, maps, search, yearF, classF, sectionF, subjectF, statusF, teacherF]);
  const { visible, more } = useShowMore(filtered);

  const hasFilters = Boolean(search) || [yearF, classF, sectionF, teacherF, subjectF, statusF].some((v) => v !== ALL);
  const resetFilters = () => {
    setSearch('');
    setYearF(ALL);
    setClassF(ALL);
    setSectionF(ALL);
    setTeacherF(ALL);
    setSubjectF(ALL);
    setStatusF(ALL);
  };

  const changeTeacher = async (item, teacherId) => {
    setBusy(true);
    const ok = await act(() => api.updateSectionSubject(item.id, { teacherId: teacherId || null }), 'Assigned teacher updated successfully');
    setBusy(false);
    if (ok) reload();
  };

  const importFile = async () => {
    try {
      const text = await pickCsvText();
      if (text == null) return;
      const parsed = parseAssignments(text);
      if (!parsed.length) return toast.error('No valid assignment rows found in file');
      setImporting(true);
      const res = await importEach(parsed, async (row) => {
        const cls = d.classes.find((c) => c.name.toLowerCase() === row.className.toLowerCase());
        if (!cls) throw new Error('class');
        let year = row.academicYear
          ? d.years.find((y) => y.name.toLowerCase() === row.academicYear.toLowerCase() || (y.code && y.code.toLowerCase() === row.academicYear.toLowerCase()))
          : null;
        if (!year) year = d.years.find((y) => y.isCurrent || y.status === 'ACTIVE') || d.years[0];
        const section = d.sections.find((s) => (!year || s.academicYearId === year.id) && s.classId === cls.id && s.name.toLowerCase() === row.sectionName.toLowerCase());
        if (!section) throw new Error('section');
        const subject = d.subjects.find((s) => (s.code && s.code.toLowerCase() === row.subjectCode.toLowerCase()) || s.name.toLowerCase() === row.subjectCode.toLowerCase());
        if (!subject) throw new Error('subject');
        const teacher = row.teacherEmail
          ? d.teachers.find((t) => (t.email && t.email.toLowerCase() === row.teacherEmail.toLowerCase()) || t.name.toLowerCase() === row.teacherEmail.toLowerCase())
          : null;
        await api.addSectionSubject(section.id, {
          subjectId: subject.id,
          teacherId: teacher ? teacher.id : null,
          maxMarks: row.maxMarks || 100,
          passingMarks: row.passingMarks || 33,
          isOptional: false,
          status: 'ACTIVE',
        });
      });
      importSummary(res, 'subject assignments imported');
      if (res.success) reload();
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
    }
  };

  const exportFile = () => {
    const out = [
      'Academic Year,Class,Section,Subject Code,Subject Name,Subject Type,Assigned Teacher,Teacher Department,Teacher Email,Max Marks,Passing Marks,Status',
      ...filtered.map((a) =>
        [
          a.academicYear?.name,
          a.class?.name,
          a.section?.name,
          a.subject?.code,
          a.subject?.name,
          a.subject?.subjectType || 'THEORY',
          a.teacher?.name || 'Vacant / Unassigned',
          a.teacher?.department,
          a.teacher?.email,
          a.maxMarks ?? 100,
          a.passingMarks ?? 33,
          a.status || 'ACTIVE',
        ]
          .map(csvEscape)
          .join(','),
      ),
    ];
    shareCsv('subject_assignments.csv', out.join('\n')).catch(() => {});
  };

  const opt = (arr, label, allLabel) => [{ value: ALL, label: allLabel }, ...arr.map((x) => ({ value: x.id, label: label(x) }))];
  const sectionPool = d ? d.sections.filter((s) => (yearF === ALL || s.academicYearId === yearF) && (classF === ALL || s.classId === classF)) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Subject Assignments' }} />
      <RefreshableScroll onRefresh={() => state.reload()} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <AsyncView state={state} skeleton={<SkeletonCards padded={false} />}>
          {(data) => {
            const all = data.assignments;
            return (
              <>
                <Text style={{ color: theme.textMuted, fontSize: font.sm, marginBottom: spacing.md }}>
                  Manage subject allocations, teachers and evaluation criteria across all class sections.
                </Text>
                <Button title="Assign subject" icon="add-circle-outline" onPress={() => router.push('/principal/academics/subject-assignments/form')} />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm, flexWrap: 'wrap' }}>
                  <ActionPill icon="download-outline" label="Sample CSV" tone="muted" onPress={() => shareCsv('subject_assignments_sample.csv', SAMPLES.assignments).catch(() => {})} />
                  <ActionPill icon="cloud-upload-outline" label={importing ? 'Importing...' : 'Import CSV'} tone="muted" disabled={importing} onPress={importFile} />
                  {all.length ? <ActionPill icon="share-outline" label="Export" tone="muted" onPress={exportFile} /> : null}
                </View>

                <CountGrid
                  items={[
                    { label: 'Total assignments', value: all.length },
                    { label: 'Classes covered', value: new Set(all.map((a) => a.classId)).size },
                    { label: 'Sections covered', value: new Set(all.map((a) => a.sectionId)).size },
                    { label: 'Teachers assigned', value: all.filter((a) => a.teacherId).length },
                    { label: 'Vacant', value: all.filter((a) => !a.teacherId).length },
                  ]}
                />

                <Input icon="search-outline" placeholder="Search subject, class, section, teacher..." value={search} onChangeText={setSearch} style={{ marginBottom: spacing.sm }} />
                <FilterChips
                  value={statusF}
                  onChange={setStatusF}
                  options={[
                    { value: ALL, label: 'All', count: all.length },
                    { value: 'ACTIVE', label: 'Active', count: all.filter((a) => (a.status || 'ACTIVE') === 'ACTIVE').length },
                    { value: 'INACTIVE', label: 'Inactive', count: all.filter((a) => a.status === 'INACTIVE').length },
                  ]}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
                  <ActionPill icon="options-outline" label={showFilters ? 'Hide filters' : 'More filters'} tone="muted" onPress={() => setShowFilters((v) => !v)} />
                  {hasFilters ? <ActionPill icon="refresh-outline" label="Reset" tone="danger" onPress={resetFilters} /> : null}
                </View>
                {showFilters ? (
                  <Card style={{ marginBottom: spacing.md }}>
                    <Select label="Academic year" value={yearF} onChange={(v) => { setYearF(v); setSectionF(ALL); }} options={opt(data.years, (y) => `${y.name}${y.isCurrent ? ' (Current)' : ''}`, 'All years')} />
                    <Select label="Class" value={classF} onChange={(v) => { setClassF(v); setSectionF(ALL); }} options={opt(data.classes, (c) => c.name, 'All classes')} />
                    <Select label="Section" value={sectionF} onChange={setSectionF} options={opt(sectionPool, (s) => `${data.classes.find((c) => c.id === s.classId)?.name || 'Class'} - ${s.name}`, 'All sections')} />
                    <Select label="Subject" value={subjectF} onChange={setSubjectF} options={opt(data.subjects, (s) => s.name, 'All subjects')} />
                    <Select
                      label="Teacher"
                      value={teacherF}
                      onChange={setTeacherF}
                      options={[
                        { value: ALL, label: 'All teachers' },
                        { value: 'ASSIGNED', label: 'Teacher assigned' },
                        { value: 'VACANT', label: 'Vacant (no teacher)' },
                        ...data.teachers.map((t) => ({ value: t.id, label: teacherLabel(t) })),
                      ]}
                    />
                  </Card>
                ) : null}

                {!all.length ? (
                  <EmptyState icon="git-network-outline" title="No subject assignments yet" message="Assign subjects to class sections to define the curriculum and allocate teachers." />
                ) : !filtered.length ? (
                  <EmptyState icon="funnel-outline" title="No assignments match" action={<Button title="Reset filters" variant="ghost" onPress={resetFilters} />} />
                ) : (
                  visible.map((item) => {
                    const sub = item.subject || maps.subject.get(item.subjectId);
                    const tch = item.teacher || maps.teacher.get(item.teacherId);
                    return (
                      <Card key={item.id} style={{ marginTop: spacing.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                          <Text style={{ flex: 1, fontSize: font.lg, fontWeight: '800', color: theme.text }}>
                            {sub?.name || 'Subject'}
                            {sub?.code ? ` (${sub.code})` : ''}
                          </Text>
                          <StatusBadge status={item.status || 'ACTIVE'} />
                        </View>
                        <Meta>
                          {item.class?.name || maps.cls.get(item.classId)?.name || 'Class'} - Section {item.section?.name || maps.section.get(item.sectionId)?.name || '-'}
                        </Meta>
                        <Meta>{item.academicYear?.name || maps.year.get(item.academicYearId)?.name || '-'}</Meta>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <Badge label={`Max ${item.maxMarks ?? 100}`} tone="muted" />
                          <Badge label={`Pass ${item.passingMarks ?? 33}`} tone="muted" />
                          {item.isOptional ? <Badge label="Optional" tone="info" /> : null}
                          {!item.teacherId ? <Badge label="No teacher" tone="warning" /> : null}
                        </View>
                        <View style={{ marginTop: spacing.md }}>
                          <Select
                            label="Teacher"
                            value={item.teacherId || ''}
                            onChange={(v) => changeTeacher(item, v)}
                            disabled={busy}
                            options={[{ value: '', label: 'Vacant / unassigned' }, ...data.teachers.map((t) => ({ value: t.id, label: teacherLabel(t) }))]}
                            placeholder={tch?.name || 'Vacant / unassigned'}
                          />
                        </View>
                        <ActionRow>
                          <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/subject-assignments/form', params: { id: item.id } })} />
                          <ActionPill
                            icon="trash-outline"
                            label="Remove"
                            tone="danger"
                            onPress={async () => {
                              const ok = await actConfirmed(
                                { title: 'Remove assignment', message: `Remove "${sub?.name || 'this subject'}" from the section?`, confirmText: 'Remove' },
                                () => api.deleteSectionSubject(item.id),
                                'Subject assignment removed successfully',
                              );
                              if (ok) reload();
                            }}
                          />
                        </ActionRow>
                      </Card>
                    );
                  })
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
