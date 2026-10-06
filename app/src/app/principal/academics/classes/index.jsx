import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { confirm, toast, showError } from '../../../../lib/notify';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { AsyncView, EmptyState, Select } from '../../../../components/kit';
import { Button, Card } from '../../../../components/ui';
import { SkeletonCards } from '../../../../components/Skeleton';
import { ActionPill, ActionRow, FilterChips, Meta, StatusBadge } from '../../../../components/principal/academics/kit';
import { actConfirmed, classDescription, importEach, importSummary } from '../../../../components/principal/academics/helpers';
import { SAMPLES, csvEscape, parseClasses, pickCsvText, shareCsv } from '../../../../components/principal/academics/csv';
import { font, spacing } from '../../../../theme';

// School-wide class master list, optionally narrowed to the classes mapped into one academic year.
export default function ClassesScreen() {
  const theme = useTheme();
  const [yearId, setYearId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [importing, setImporting] = useState(false);

  // Years + which years each class is mapped into (shown as "Mapped academic years").
  const refs = useAsync(
    async () => {
      const years = await api.years({ limit: 100 });
      const lookup = {};
      await Promise.all(
        years.map(async (y) => {
          try {
            const mapped = await api.yearClasses(y.id);
            mapped.forEach((m) => {
              (lookup[m.classId] ||= []).push(y.name);
            });
          } catch {
            // a year whose mapping fails just shows no mapping
          }
        }),
      );
      return { years, lookup };
    },
    [],
    { refetchOnFocus: true },
  );

  const state = useAsync(
    async () => {
      if (yearId) {
        const mapped = await api.yearClasses(yearId);
        return mapped.filter((m) => m.class).map((m) => ({ ...m.class, id: m.classId, mappingId: m.id }));
      }
      return api.classes({ limit: 100 });
    },
    [yearId],
    { refetchOnFocus: true },
  );

  const reloadAll = () => {
    state.reload({ silent: true });
    refs.reload({ silent: true });
  };

  const importFile = async () => {
    try {
      const text = await pickCsvText();
      if (text == null) return;
      const rows = parseClasses(text);
      if (!rows.length) return toast.error('No valid rows found');
      setImporting(true);
      const res = await importEach(rows, async (row) => {
        const created = await api.createClass({ ...row, description: row.description?.trim() || classDescription(row) });
        const newId = created?.data?.id;
        if (yearId && newId) await api.addClassToYear(yearId, newId);
      });
      importSummary(res);
      if (res.success) reloadAll();
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
    }
  };

  const years = refs.data?.years || [];
  const lookup = refs.data?.lookup || {};

  return (
    <>
      <Stack.Screen options={{ title: 'Classes' }} />
      <RefreshableScroll onRefresh={async () => { await Promise.all([state.reload(), refs.reload()]); }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <Text style={{ color: theme.textMuted, fontSize: font.sm, marginBottom: spacing.md }}>
          School-wide class master list. Classes can be reused across academic years.
        </Text>
        <Button title="Create class" icon="add-circle-outline" onPress={() => router.push({ pathname: '/principal/academics/classes/form', params: yearId ? { yearId } : {} })} />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm, flexWrap: 'wrap' }}>
          <ActionPill icon="download-outline" label="Sample CSV" tone="muted" onPress={() => shareCsv('classes_sample.csv', SAMPLES.classes).catch(() => {})} />
          <ActionPill icon="cloud-upload-outline" label={importing ? 'Importing...' : 'Import CSV'} tone="muted" disabled={importing} onPress={importFile} />
          <ActionPill
            icon="sparkles-outline"
            label="Add standard classes"
            tone="muted"
            onPress={async () => {
              const ok = await confirm('Add standard classes', 'Create the default class list for this school? This only works while the school has no classes yet.', { confirmText: 'Add' });
              if (!ok) return;
              try {
                const res = await api.seedClasses();
                toast.success(res?.message || 'Done');
                reloadAll();
              } catch (err) {
                showError(err);
              }
            }}
          />
        </View>

        <Select
          label="Academic year"
          value={yearId}
          onChange={(v) => { setYearId(v); setStatus('ALL'); }}
          options={[{ value: '', label: 'All classes (school master list)' }, ...years.map((y) => ({ value: y.id, label: `${y.name}${y.isCurrent ? ' (Current)' : ''}` }))]}
        />

        <AsyncView state={state} skeleton={<SkeletonCards padded={false} />}>
          {(classes) => {
            const counts = { ALL: classes.length, ACTIVE: classes.filter((c) => c.status === 'ACTIVE').length, INACTIVE: classes.filter((c) => c.status === 'INACTIVE').length };
            const filtered = status === 'ALL' ? classes : classes.filter((c) => c.status === status);
            return (
              <>
                {classes.length ? (
                  <>
                    <FilterChips
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: 'ALL', label: 'All', count: counts.ALL },
                        { value: 'ACTIVE', label: 'Active', count: counts.ACTIVE },
                        { value: 'INACTIVE', label: 'Inactive', count: counts.INACTIVE },
                      ]}
                    />
                    <View style={{ flexDirection: 'row', marginTop: spacing.xs }}>
                      <ActionPill
                        icon="share-outline"
                        label="Export"
                        tone="muted"
                        onPress={() => {
                          const rows = ['name,description,status', ...classes.map((c) => [c.name, c.description || '', c.status].map(csvEscape).join(','))];
                          shareCsv('classes.csv', rows.join('\n')).catch(() => {});
                        }}
                      />
                    </View>
                  </>
                ) : null}

                {!filtered.length ? (
                  <EmptyState
                    icon="layers-outline"
                    title="No classes found"
                    message="Try changing the filter options or create a class."
                    action={<Button title="Create class" variant="ghost" onPress={() => router.push('/principal/academics/classes/form')} />}
                  />
                ) : (
                  filtered.map((cls) => (
                    <Card key={cls.id} style={{ marginTop: spacing.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
                        <Text style={{ flex: 1, fontSize: font.lg, fontWeight: '800', color: theme.text }}>{cls.name}</Text>
                        <StatusBadge status={cls.status} />
                      </View>
                      <Meta>Mapped years: {lookup[cls.id]?.length ? lookup[cls.id].join(', ') : 'Global only'}</Meta>
                      <Meta>{classDescription(cls)}</Meta>
                      <ActionRow>
                        <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/classes/form', params: { id: cls.id } })} />
                        <ActionPill
                          icon="trash-outline"
                          label="Delete"
                          tone="danger"
                          onPress={async () => {
                            const ok = await actConfirmed(
                              { title: 'Delete class', message: `Delete class "${cls.name}"?`, confirmText: 'Delete' },
                              () => api.deleteClass(cls.id),
                              'Class deleted successfully',
                            );
                            if (ok) reloadAll();
                          }}
                        />
                      </ActionRow>
                    </Card>
                  ))
                )}
              </>
            );
          }}
        </AsyncView>
      </RefreshableScroll>
    </>
  );
}
