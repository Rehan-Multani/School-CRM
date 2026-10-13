import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMiscApi } from '../../../api/principal/misc';
import { API_URL } from '../../../api/client';
import { fmtDateTime } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { Badge, Chip, EmptyState, SearchBar } from '../../../components/kit';
import { Button } from '../../../components/ui';
import { font, radius, spacing } from '../../../theme';

// Web: Principal → Student Enquiry. The list of submissions from the school's public form,
// plus the form link (copy / share). The form fields themselves are edited on the web panel.
const STATUSES = ['NEW', 'CONTACTED', 'VISITED', 'ADMITTED', 'CLOSED'];
const TONE = { NEW: 'primary', CONTACTED: 'warning', VISITED: 'info', ADMITTED: 'success', CLOSED: 'muted' };
const label = (s) => s[0] + s.slice(1).toLowerCase();
// The public form lives on the web site, next to the API (…/api/v1 → site root).
const SITE_URL = API_URL.replace(/\/api\/v1$/, '');

export default function StudentEnquiries() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState(false);
  const list = useRef(null);

  useEffect(() => {
    principalMiscApi
      .studentEnquiryForm()
      .then((res) => setForm(res?.data || null))
      .catch(() => {});
  }, []);

  const link = form?.path ? `${SITE_URL}${form.path}` : '';

  const copy = useCallback(async () => {
    if (!link) return;
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast('Link copied', 'success');
    } catch (err) {
      showError(err);
    }
  }, [link]);

  const share = useCallback(async () => {
    if (!link) return;
    try {
      await Share.share({ message: `Fill this form to enquire about admission at ${form?.schoolName || 'our school'}:\n${link}`, url: link });
    } catch (err) {
      showError(err);
    }
  }, [link, form]);

  const setItemStatus = async (item, next) => {
    if (next === item.status) return;
    try {
      const res = await principalMiscApi.updateStudentEnquiry(item.id, { status: next });
      list.current?.update?.((rows) => rows.map((r) => (r.id === item.id ? res.data : r)));
      list.current?.reload?.();
    } catch (err) {
      showError(err);
    }
  };

  const header = (
    <View style={{ paddingTop: spacing.lg }}>
      <View style={styles.linkCard}>
        <Text style={styles.linkTitle}>Enquiry form link</Text>
        {form && !form.enabled ? <Text style={styles.off}>Form is switched off (enable it on the web panel)</Text> : null}
        <Text style={styles.link} numberOfLines={2} selectable>
          {link || 'Loading…'}
        </Text>
        <View style={styles.linkActions}>
          <Button title={copied ? 'Copied' : 'Copy link'} icon={copied ? 'checkmark' : 'copy-outline'} onPress={copy} disabled={!link} style={{ flex: 1 }} />
          <Button title="Share" icon="share-social-outline" variant="outline" onPress={share} disabled={!link} style={{ flex: 1 }} />
        </View>
      </View>

      <View style={styles.statRow}>
        {[
          ['Total', stats?.TOTAL],
          ['New', stats?.NEW],
          ['Contacted', stats?.CONTACTED],
          ['Admitted', stats?.ADMITTED],
        ].map(([l, v]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statVal}>{v ?? '–'}</Text>
            <Text style={styles.statLbl}>{l}</Text>
          </View>
        ))}
      </View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search student, parent, mobile..." onClear={() => setQ('')} style={{ marginBottom: spacing.md }} />
      <View style={styles.chips}>
        {['ALL', ...STATUSES].map((s) => (
          <Chip key={s} label={s === 'ALL' ? 'All' : label(s)} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Student Enquiry' }} />
      <PagedList
        ref={list}
        deps={[q, status]}
        fetchPage={async (page) => {
          const res = await principalMiscApi.studentEnquiries({
            page,
            limit: 20,
            status: status === 'ALL' ? undefined : status,
            search: q.trim() || undefined,
          });
          if (res?.stats) setStats(res.stats);
          return res;
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No enquiries yet" message="Share the form link with parents. Their enquiries will show up here." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={2}>
                {item.studentName || 'Student'}
              </Text>
              <Badge label={label(item.status)} tone={TONE[item.status] || 'muted'} />
            </View>
            {item.classApplying ? <Text style={styles.sub}>Class: {item.classApplying}</Text> : null}
            {item.parentName ? <Text style={styles.sub}>Parent: {item.parentName}</Text> : null}
            {item.mobile ? (
              <Pressable onPress={() => Linking.openURL(`tel:${item.mobile}`)} style={styles.callRow} accessibilityRole="button" accessibilityLabel={`Call ${item.mobile}`}>
                <Ionicons name="call-outline" size={15} color={theme.primary} />
                <Text style={[styles.sub, { color: theme.primary, marginTop: 0 }]}>{item.mobile}</Text>
              </Pressable>
            ) : null}
            {item.email ? <Text style={styles.sub}>{item.email}</Text> : null}
            {item.extra.map((e) => (
              <Text key={e.key} style={styles.extra}>
                <Text style={styles.extraKey}>{e.label}: </Text>
                {e.value}
              </Text>
            ))}
            <Text style={styles.when}>{fmtDateTime(item.createdAt)}</Text>
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <Chip key={s} label={label(s)} active={item.status === s} onPress={() => setItemStatus(item, s)} />
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    linkCard: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    linkTitle: { color: t.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    off: { color: t.danger, fontSize: font.sm, fontWeight: '700', marginTop: 4 },
    link: { color: t.text, fontSize: font.sm, fontWeight: '600', marginVertical: spacing.sm },
    linkActions: { flexDirection: 'row', gap: spacing.sm },
    statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    stat: { flex: 1, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
    statVal: { color: t.text, fontSize: font.xl, fontWeight: '800' },
    statLbl: { color: t.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    card: { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '800' },
    sub: { color: t.textMuted, fontSize: font.sm, marginTop: 4 },
    callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    extra: { color: t.text, fontSize: font.sm, marginTop: 4 },
    extraKey: { color: t.textMuted, fontWeight: '700' },
    when: { color: t.textMuted, fontSize: 11, marginTop: spacing.sm, marginBottom: spacing.sm },
  });
