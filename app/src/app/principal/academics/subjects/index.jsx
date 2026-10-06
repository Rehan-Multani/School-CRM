import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast, showError } from '../../../../lib/notify';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { AsyncView, Badge, EmptyState, Select } from '../../../../components/kit';
import { Button, Card } from '../../../../components/ui';
import { SkeletonCards } from '../../../../components/Skeleton';
import { ActionPill, ActionRow, FilterChips, Meta, StatusBadge, useShowMore } from '../../../../components/principal/academics/kit';
import { actConfirmed, importEach, importSummary } from '../../../../components/principal/academics/helpers';
import { SAMPLES, csvEscape, parseSubjects, pickCsvText, shareCsv } from '../../../../components/principal/academics/csv';
import { font, spacing } from '../../../../theme';

// Reusable school-wide subject master list. Year / class filters use the
// section-subject assignments (a subject belongs to a class once it is assigned).
export default function SubjectsScreen() {
  const theme = useTheme();
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [importing, setImporting] = useState(false);

  const refs = useAsync(async () => {
    const [classes, years] = await Promise.all([api.classes({ limit: 100 }), api.years({ limit: 100 })]);
    return { classes: classes.filter((c) => c.status === 'ACTIVE'), years };
  }, []);

  const state = useAsync(
    async () => {
      const [subjects, assignments] = await Promise.all([api.subjects({ limit: 100 }), api.allSectionSubjects(yearId ? { academicYearId: yearId } : {})]);
      const names = {};
      const classIds = {};
      assignments.forEach((a) => {
        const sid = a.subjectId || a.subject?.id;
        const cid = a.classId || a.class?.id;
        if (!sid) return;
        (names[sid] ||= new Set());
        (classIds[sid] ||= new Set());
        if (a.class?.name) names[sid].add(a.class.name);
        if (cid) classIds[sid].add(cid);
      });
      return { subjects, names, classIds };
    },
    [yearId],
    { refetchOnFocus: true },
  );

  const rows = useMemo(() => {
    const d = state.data;
    if (!d) return [];
    return d.subjects.filter((s) => !classId || d.classIds[s.id]?.has(classId));
  }, [state.data, classId]);
  const filtered = status === 'ALL' ? rows : rows.filter((s) => s.status === status);
  const { visible, more } = useShowMore(filtered);

  const importFile = async () => {
    try {
      const text = await pickCsvText();
      if (text == null) return;
      const parsed = parseSubjects(text);
      if (!parsed.length) return toast.error('No valid rows found');
      setImporting(true);
      const res = await importEach(parsed, (row) => api.createSubject(row));
      importSummary(res);
      if (res.success) state.reload({ silent: true });
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
    }
  };

  const years = refs.data?.years || [];
  const classes = refs.data?.classes || [];

  return (
    <>
      <Stack.Screen options={{ title: 'Subjects' }} />
      <RefreshableScroll onRefresh={async () => { await Promise.all([state.reload(), refs.reload()]); }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <Text style={{ color: theme.textMuted, fontSize: font.sm, marginBottom: spacing.md }}>Reusable school-wide subject master list.</Text>
        <Button title="Create subject" icon="add-circle-outline" onPress={() => router.push('/principal/academics/subjects/form')} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm, flexWrap: 'wrap' }}>
          <ActionPill icon="download-outline" label="Sample CSV" tone="muted" onPress={() => shareCsv('subjects_sample.csv', SAMPLES.subjects).catch(() => {})} />
          <ActionPill icon="cloud-upload-outline" label={importing ? 'Importing...' : 'Import CSV'} tone="muted" disabled={importing} onPress={importFile} />
          {state.data?.subjects.length ? (
            <ActionPill
              icon="share-outline"
              label="Export"
              tone="muted"
              onPress={() => {
                const out = ['name,code,subjectType,status', ...state.data.subjects.map((s) => [s.name, s.code || '', s.subjectType, s.status].map(csvEscape).join(','))];
                shareCsv('subjects.csv', out.join('\n')).catch(() => {});
              }}
            />
          ) : null}
        </View>

        <Select
          label="Academic year"
          value={yearId}
          onChange={setYearId}
          options={[{ value: '', label: 'All academic years' }, ...years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))]}
        />
        <Select label="Class" value={classId} onChange={setClassId} options={[{ value: '', label: 'All classes (global master)' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />

        <AsyncView state={state} skeleton={<SkeletonCards padded={false} />}>
          {(data) => (
            <>
              <FilterChips
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'ALL', label: 'All', count: rows.length },
                  { value: 'ACTIVE', label: 'Active', count: rows.filter((s) => s.status === 'ACTIVE').length },
                  { value: 'INACTIVE', label: 'Inactive', count: rows.filter((s) => s.status === 'INACTIVE').length },
                ]}
              />
              {!filtered.length ? (
                <EmptyState icon="book-outline" title="No subjects yet" message="Create subjects once and assign them to multiple sections." />
              ) : (
                visible.map((subject) => (
                  <Card key={subject.id} style={{ marginTop: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ flex: 1, fontSize: font.lg, fontWeight: '800', color: theme.text }}>{subject.name}</Text>
                      <StatusBadge status={subject.status} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {subject.code ? <Badge label={subject.code} tone="primary" /> : null}
                      <Badge label={subject.subjectType || 'THEORY'} tone="info" />
                    </View>
                    {subject.description ? <Meta>{subject.description}</Meta> : null}
                    <Meta>Assigned classes: {data.names[subject.id]?.size ? Array.from(data.names[subject.id]).join(', ') : 'Global only'}</Meta>
                    <ActionRow>
                      <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/subjects/form', params: { id: subject.id } })} />
                      <ActionPill
                        icon="trash-outline"
                        label="Delete"
                        tone="danger"
                        onPress={async () => {
                          const ok = await actConfirmed({ title: 'Delete subject', message: `Delete subject "${subject.name}"?`, confirmText: 'Delete' }, () => api.deleteSubject(subject.id), 'Subject deleted');
                          if (ok) state.reload({ silent: true });
                        }}
                      />
                    </ActionRow>
                  </Card>
                ))
              )}
              {more ? <View style={{ marginTop: spacing.md }}>{more}</View> : null}
            </>
          )}
        </AsyncView>
      </RefreshableScroll>
    </>
  );
}
