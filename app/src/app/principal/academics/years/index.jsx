import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { principalAcademicsApi as api } from '../../../../api/principal/academics';
import { useAsync } from '../../../../lib/useAsync';
import { useTheme } from '../../../../context/ThemeContext';
import { toast, showError } from '../../../../lib/notify';
import { fmtDate } from '../../../../lib/format';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import { AsyncView, Badge, EmptyState } from '../../../../components/kit';
import { Button, Card } from '../../../../components/ui';
import { SkeletonCards } from '../../../../components/Skeleton';
import { ActionPill, ActionRow, FilterChips, Meta, YEAR_TONE, yearHint } from '../../../../components/principal/academics/kit';
import { deleteYear, importEach, importSummary, runYearAction, yearActions } from '../../../../components/principal/academics/helpers';
import { SAMPLES, csvEscape, parseYears, pickCsvText, shareCsv } from '../../../../components/principal/academics/csv';
import { font, spacing } from '../../../../theme';

const STATUSES = ['ALL', 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export default function YearsScreen() {
  const theme = useTheme();
  const state = useAsync(() => api.years(), [], { refetchOnFocus: true });
  const [status, setStatus] = useState('ALL');
  const [importing, setImporting] = useState(false);

  const reload = () => state.reload({ silent: true });

  const importFile = async () => {
    try {
      const text = await pickCsvText();
      if (text == null) return;
      const rows = parseYears(text);
      if (!rows.length) return toast.error('No valid rows found in file');
      setImporting(true);
      const res = await importEach(rows, (row) => {
        if (!row.name || !row.startDate || !row.endDate) throw new Error('incomplete');
        return api.createYear(row);
      });
      importSummary(res);
      if (res.success) reload();
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
    }
  };

  const exportFile = (years) => {
    const rows = ['name,code,startDate,endDate,status', ...years.map((y) => [y.name, y.code || '', y.startDate?.slice(0, 10) || '', y.endDate?.slice(0, 10) || '', y.status].map(csvEscape).join(','))];
    shareCsv('academic_years.csv', rows.join('\n')).catch(() => {});
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Academic Years' }} />
      <RefreshableScroll onRefresh={() => state.reload()} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
        <AsyncView state={state} skeleton={<SkeletonCards padded={false} />}>
          {(years) => {
            const filtered = status === 'ALL' ? years : years.filter((y) => y.status === status);
            return (
              <>
                <Button title="Create academic year" icon="add-circle-outline" onPress={() => router.push('/principal/academics/years/form')} />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
                  <ActionPill icon="download-outline" label="Sample CSV" tone="muted" onPress={() => shareCsv('academic_years_sample.csv', SAMPLES.years).catch(() => {})} />
                  <ActionPill icon="cloud-upload-outline" label={importing ? 'Importing...' : 'Import CSV'} tone="muted" disabled={importing} onPress={importFile} />
                  {years.length ? <ActionPill icon="share-outline" label="Export" tone="muted" onPress={() => exportFile(filtered.length ? filtered : years)} /> : null}
                </View>

                {years.length ? (
                  <FilterChips
                    value={status}
                    onChange={setStatus}
                    options={STATUSES.map((s) => ({ value: s, label: s === 'ALL' ? 'All' : s[0] + s.slice(1).toLowerCase(), count: s === 'ALL' ? years.length : years.filter((y) => y.status === s).length }))}
                  />
                ) : null}

                {!years.length ? (
                  <EmptyState icon="calendar-outline" title="No academic years yet" message="Create your first academic year to start mapping classes, sections and subjects." />
                ) : !filtered.length ? (
                  <EmptyState icon="funnel-outline" title={`No ${status.toLowerCase()} years`} action={<Button title="Clear filter" variant="ghost" onPress={() => setStatus('ALL')} />} />
                ) : (
                  filtered.map((year) => (
                    <Card key={year.id} style={{ marginTop: spacing.md }}>
                      <Pressable onPress={() => router.push(`/principal/academics/years/${year.id}`)} accessibilityRole="button">
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                          <Text style={{ flex: 1, fontSize: font.lg, fontWeight: '800', color: theme.text }}>{year.name}</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {year.isCurrent ? <Badge label="Current" tone="success" icon="star" /> : null}
                            <Badge label={year.status} tone={YEAR_TONE[year.status] || 'muted'} />
                          </View>
                        </View>
                        {year.code ? <Meta>Code: {year.code}</Meta> : null}
                        <Meta>
                          {fmtDate(year.startDate)} - {fmtDate(year.endDate)}
                        </Meta>
                        <Meta>
                          {year.counts?.classes ?? 0} classes, {year.counts?.students ?? 0} students
                        </Meta>
                        <Text style={{ color: theme.textMuted, fontSize: font.sm, marginTop: 6, fontStyle: 'italic' }}>{yearHint(year)}</Text>
                      </Pressable>
                      <ActionRow>
                        <ActionPill icon="eye-outline" label="Open" onPress={() => router.push(`/principal/academics/years/${year.id}`)} />
                        {yearActions(year).map((a) => (
                          <ActionPill key={a.key} icon={a.icon} label={a.label} tone={a.tone} onPress={async () => (await runYearAction(year, a)) && reload()} />
                        ))}
                        <ActionPill icon="create-outline" label="Edit" tone="muted" onPress={() => router.push({ pathname: '/principal/academics/years/form', params: { id: year.id } })} />
                        <ActionPill icon="trash-outline" label="Delete" tone="danger" onPress={async () => (await deleteYear(year)) && reload()} />
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
