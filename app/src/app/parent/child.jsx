import { StyleSheet, Text, View } from 'react-native';
import { usePortal } from '../../context/PortalScope';
import { useStyles } from '../../context/ThemeContext';
import { useAsync } from '../../lib/useAsync';
import { fmtDate } from '../../lib/format';
import { fileUrl } from '../../lib/links';
import { Card } from '../../components/ui';
import { AsyncView, Avatar, Badge, SectionTitle } from '../../components/kit';
import { SkeletonDetail } from '../../components/Skeleton';
import RefreshableScroll from '../../components/RefreshableScroll';
import { childClassLine } from '../../components/parent/ChildSwitcher';
import { font, spacing } from '../../theme';

function Line({ label, value, styles }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value || '—'}</Text>
    </View>
  );
}

// The selected child's school record (doc 03 §6 "Child profile"). Read-only —
// these are the school's verified records.
export default function ChildProfile() {
  const { api, scopeKey } = usePortal();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.childProfile(), [scopeKey], { cacheKey: 'parent.child' });

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail avatar padded={false} />}>
        {(c) => (
          <>
            <Card style={{ alignItems: 'center' }}>
              <Avatar source={fileUrl(c.photo)} name={c.name} size={84} />
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.muted}>{childClassLine(c)}</Text>
              <View style={{ marginTop: spacing.sm }}>
                <Badge label={c.status || 'ACTIVE'} tone={c.status === 'ACTIVE' ? 'success' : 'muted'} />
              </View>
            </Card>

            <SectionTitle title="Academic" />
            <Card>
              <Line styles={styles} label="Admission no." value={c.admissionNumber} />
              <Line styles={styles} label="Class" value={[c.className, c.sectionName].filter(Boolean).join(' - ')} />
              <Line styles={styles} label="Roll no." value={c.rollNumber} />
              <Line styles={styles} label="Academic year" value={c.academicYear} />
            </Card>

            <SectionTitle title="Personal" />
            <Card>
              <Line styles={styles} label="Date of birth" value={c.dateOfBirth ? fmtDate(c.dateOfBirth) : ''} />
              <Line styles={styles} label="Gender" value={c.gender ? c.gender[0] + c.gender.slice(1).toLowerCase() : ''} />
              <Line styles={styles} label="Your relationship" value={c.relationship ? c.relationship[0] + c.relationship.slice(1).toLowerCase() : ''} />
              <Line styles={styles} label="Phone" value={c.phone} />
              <Line styles={styles} label="Email" value={c.email} />
              <Line styles={styles} label="Address" value={c.address} />
            </Card>
            <Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.lg }]}>To correct any of these details, please contact the school office.</Text>
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    name: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: spacing.md },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: spacing.md },
    lineLabel: { fontSize: font.md, color: t.textMuted },
    lineValue: { flex: 1, textAlign: 'right', fontSize: font.md, color: t.text, fontWeight: '600' },
  });
