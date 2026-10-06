import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../../context/AuthContext';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { ymd } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { Button } from '../../../components/ui';
import { Badge, Chip, DateField, EmptyState, ErrorView, SearchBar, Select } from '../../../components/kit';
import { SkeletonList } from '../../../components/Skeleton';
import {
  REPORT_CATEGORIES,
  sortValue,
  statItems,
  statusKey,
  statusLabel,
} from '../../../components/principal/misc/reportCategories';
import { font, radius, spacing } from '../../../theme';

// Web: SchoolReportsHub category view. Pages through the whole report (500/page, max 5000 rows)
// so search + sort + share cover every record; shows 25 at a time. Share = PDF via the share sheet
// (the web's print/CSV/Excel are replaced by this one export).
const FETCH_PAGE = 500;
const MAX_ROWS = 5000;
const SHOW = 25;
const TONE = {
  ACTIVE: 'success', PAID: 'success', COMPLETED: 'success', SUCCESS: 'success', PUBLISHED: 'success', EVALUATED: 'success', RESOLVED: 'success',
  PENDING: 'warning', PARTIALLY_PAID: 'warning', ON_HOLD: 'warning', OPEN: 'warning',
  PROCESSED: 'info', SCHEDULED: 'info', IN_PROGRESS: 'info', ASSIGNED: 'info', SUBMITTED: 'info',
  OVERDUE: 'danger', CANCELLED: 'danger', INACTIVE: 'danger', DISCONTINUED: 'danger',
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default function ReportView() {
  const { category: id } = useLocalSearchParams();
  const cat = REPORT_CATEGORIES.find((c) => c.id === id);
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { school } = useAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [desc, setDesc] = useState(false);
  const [shown, setShown] = useState(SHOW);
  const [sharing, setSharing] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(
    async (mode = 'initial') => {
      if (!cat) return;
      const my = ++reqId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const params = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: status !== 'ALL' ? status : undefined,
          limit: FETCH_PAGE,
        };
        const all = [];
        let first = null;
        for (let p = 1; all.length < MAX_ROWS; p += 1) {
          const res = await principalMiscApi.reportData(cat.id, { ...params, page: p });
          if (my !== reqId.current) return;
          first = first || res;
          const batch = res?.data || [];
          all.push(...batch);
          if (!batch.length || all.length >= (res?.total || 0)) break;
        }
        setRows(all);
        setTotal(Math.max(first?.total || 0, all.length));
        setStats(first?.stats || null);
        setShown(SHOW);
      } catch (e) {
        if (my === reqId.current) setError(e);
      } finally {
        if (my === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cat, startDate, endDate, status],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / when a filter changes
    load();
  }, [load]);

  const columns = useMemo(() => Object.keys(rows[0] || {}), [rows]);
  const view = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q))) : rows;
    if (!sortKey) return matched;
    const dir = desc ? -1 : 1;
    return [...matched].sort((a, b) => {
      const x = sortValue(a[sortKey]);
      const y = sortValue(b[sortKey]);
      return x === y ? 0 : (x > y ? 1 : -1) * dir;
    });
  }, [rows, search, sortKey, desc]);

  if (!cat) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Report' }} />
        <EmptyState icon="alert-circle-outline" title="Unknown report" />
      </View>
    );
  }

  const preset = (kind) => {
    const now = new Date();
    const from = kind === 'MONTH' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
    setStartDate(ymd(from));
    setEndDate(ymd(now));
  };
  const hasFilters = Boolean(search.trim() || startDate || endDate || status !== 'ALL');
  const clear = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setStatus('ALL');
  };

  const share = async () => {
    setSharing(true);
    try {
      const head = columns.map((c) => `<th>${esc(c)}</th>`).join('');
      const body = view.map((r) => `<tr>${columns.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('');
      const range = startDate && endDate ? ` · ${startDate} to ${endDate}` : '';
      const st = status !== 'ALL' ? ` · ${statusLabel(status)}` : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>body{font-family:Roboto,Helvetica,Arial,sans-serif;color:#0F172A;padding:20px;font-size:10px}h1{font-size:18px;margin:0}h2{font-size:13px;margin:4px 0}
.m{color:#64748B;margin-bottom:12px}table{width:100%;border-collapse:collapse}th{background:#F1F5F9;text-align:left;padding:5px;border:1px solid #E2E8F0}td{padding:5px;border:1px solid #E2E8F0}</style></head><body>
<h1>${esc(school?.name || '')}</h1><h2>${esc(cat.label)}</h2>
<div class="m">Generated ${esc(new Date().toLocaleString('en-IN'))} · ${view.length} record${view.length === 1 ? '' : 's'}${esc(range)}${esc(st)}</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        toast.info('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: cat.label, UTI: 'com.adobe.pdf' });
    } catch (e) {
      showError(e, 'Could not create the report');
    } finally {
      setSharing(false);
    }
  };

  const items = statItems(stats);
  const sortOptions = [{ value: '', label: 'Default order' }, ...columns.map((c) => ({ value: c, label: c }))];

  const header = (
    <View style={{ paddingTop: spacing.lg }}>
      <Text style={styles.desc}>{cat.desc}</Text>
      {items.length ? (
        <View style={styles.statGrid}>
          {items.map((i) => (
            <View key={i.label} style={styles.statBox}>
              <Text style={styles.statLbl}>{i.label}</Text>
              <Text style={styles.statVal}>{i.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <SearchBar value={search} onChangeText={(v) => { setSearch(v); setShown(SHOW); }} placeholder="Search any column..." onClear={() => setSearch('')} style={{ marginBottom: spacing.md }} />
      {cat.statuses ? (
        <Select label="Status" value={status} options={[{ value: 'ALL', label: 'All statuses' }, ...cat.statuses.map((s) => ({ value: s, label: statusLabel(s) }))]} onChange={setStatus} />
      ) : null}
      {cat.dateFilter ? (
        <View>
          <View style={styles.chips}>
            <Chip label="This month" onPress={() => preset('MONTH')} />
            <Chip label="This year" onPress={() => preset('YEAR')} />
          </View>
          <DateField label="From" value={startDate} onChange={setStartDate} maximumDate={endDate ? new Date(`${endDate}T00:00:00`) : undefined} />
          <DateField label="To" value={endDate} onChange={setEndDate} minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined} />
        </View>
      ) : null}
      {columns.length ? <Select label="Sort by" value={sortKey} options={sortOptions} onChange={(v) => { setSortKey(v); setDesc(false); }} /> : null}
      <View style={styles.actions}>
        {sortKey ? <Chip label={desc ? 'Descending' : 'Ascending'} active onPress={() => setDesc((d) => !d)} /> : null}
        {hasFilters ? <Chip label="Clear filters" onPress={clear} /> : null}
      </View>
      {!loading && rows.length ? (
        <Text style={styles.count}>
          {view.length} record{view.length === 1 ? '' : 's'}
          {view.length !== rows.length ? ` (filtered from ${rows.length})` : ''}
          {total > rows.length ? ` · only the first ${rows.length} of ${total} are loaded, narrow the filters` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: cat.label }} />
      {error && !rows.length ? (
        <View style={{ flex: 1 }}>
          {header}
          <ErrorView error={error} onRetry={() => load()} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={loading ? [] : view.slice(0, shown)}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListEmptyComponent={
            loading ? (
              <SkeletonList padded={false} />
            ) : (
              <EmptyState
                icon="document-outline"
                title={rows.length === 0 && !hasFilters ? 'No records yet' : 'No matching records'}
                message={rows.length === 0 && !hasFilters ? `Nothing has been recorded for ${cat.label} so far.` : 'Try changing the search or filters.'}
              />
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} colors={[theme.primary]} tintColor={theme.primary} />}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <Text style={styles.idx}>#{index + 1}</Text>
              {columns.map((c, ci) => {
                const v = item[c];
                return (
                  <View key={c} style={[styles.line, ci === 0 && { marginTop: 0 }]}>
                    <Text style={styles.k}>{c}</Text>
                    {c === 'Status' ? (
                      <Badge label={statusLabel(v)} tone={TONE[statusKey(v)] || 'muted'} />
                    ) : (
                      <Text style={styles.v}>{String(v)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          ListFooterComponent={
            !loading && view.length > shown ? (
              <Pressable onPress={() => setShown((s) => s + SHOW)} style={styles.more} accessibilityRole="button">
                <Text style={styles.moreTxt}>Show more ({view.length - shown} left)</Text>
              </Pressable>
            ) : null
          }
        />
      )}
      {!loading && view.length ? (
        <View style={styles.bar}>
          <Button title="Share as PDF" loadingTitle="Preparing..." icon="share-outline" loading={sharing} onPress={share} />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    desc: { color: t.textMuted, fontSize: font.sm, marginBottom: spacing.md },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    statBox: { width: '48%', flexGrow: 1, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
    statLbl: { color: t.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    statVal: { color: t.text, fontSize: font.lg, fontWeight: '800', marginTop: 2 },
    chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    count: { color: t.textMuted, fontSize: font.sm, fontWeight: '600', marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    idx: { position: 'absolute', right: spacing.md, top: spacing.sm, color: t.textMuted, fontSize: 10, fontWeight: '700' },
    line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginTop: 6 },
    k: { color: t.textMuted, fontSize: font.xs, fontWeight: '700', flexShrink: 0, maxWidth: '40%' },
    v: { color: t.text, fontSize: font.sm, fontWeight: '600', flex: 1, textAlign: 'right' },
    more: { alignItems: 'center', paddingVertical: spacing.lg },
    moreTxt: { color: t.primary, fontWeight: '800', fontSize: font.md },
    bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: t.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  });
