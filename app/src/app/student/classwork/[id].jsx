import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { Card } from '../../../components/ui';
import { AsyncView, ListRow, SectionTitle, StatusBadge } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';

export default function ClassworkDetail() {
  const { id } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => studentApi.classwork(id), [id]);
  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonDetail padded={false} />}>
        {(cw) => (
          <>
            <Card>
              <View style={styles.row}>
                <Text style={styles.subject}>{cw.subjectName || 'General'}</Text>
                <StatusBadge status={cw.status} />
              </View>
              <Text style={styles.title}>{cw.title}</Text>
              <Text style={styles.muted}>
                {fmtDate(cw.assignedDate)}
                {cw.dueDate ? ` → ${fmtDate(cw.dueDate)}` : ''}
                {cw.maxMarks ? ` · ${cw.maxMarks} marks` : ''}
                {cw.teacherName ? `\n${cw.teacherName}` : ''}
              </Text>
              {cw.description ? <Text style={styles.body}>{cw.description}</Text> : null}
            </Card>
            {cw.instructions ? (
              <>
                <SectionTitle title="Instructions" />
                <Card>
                  <Text style={[styles.body, { marginTop: 0 }]}>{cw.instructions}</Text>
                </Card>
              </>
            ) : null}
            {cw.attachments?.length ? (
              <>
                <SectionTitle title="Attachments" />
                <Card style={{ paddingVertical: 0 }}>
                  {cw.attachments.map((a, i) => (
                    <ListRow key={`${a.url}-${i}`} icon="document-outline" title={a.name || `Attachment ${i + 1}`} onPress={() => openLink(a.url)} />
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    subject: { fontSize: font.sm, fontWeight: '800', color: t.primary, flex: 1 },
    title: { fontSize: font.xl, fontWeight: '800', color: t.text, marginTop: 4 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    body: { fontSize: font.lg, color: t.text, marginTop: spacing.md, lineHeight: 23 },
  });
