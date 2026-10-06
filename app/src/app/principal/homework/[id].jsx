import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import { fmtDate } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { AsyncView, ProgressBar, SectionTitle, StatusBadge } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import { KeyValue, Panel, StatGrid } from '../../../components/principal/monitoring/Common';
import { font, spacing } from '../../../theme';

export default function HomeworkDetail() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(async () => (await api.homeworkGet(id))?.data || null, [id], { refetchOnFocus: true });

  return (
    <RefreshableScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }} onRefresh={() => state.reload({ silent: true })}>
      <Stack.Screen options={{ title: 'Homework' }} />
      <AsyncView state={state} skeleton={<SkeletonDetail />}>
        {(h) =>
          !h ? null : (
            <>
              <View style={styles.head}>
                <Text style={styles.title}>{h.title}</Text>
                <StatusBadge status={h.overdue ? 'OVERDUE' : h.status} />
              </View>
              <Text style={styles.muted}>
                {[h.className, h.sectionName].filter(Boolean).join(' ') || '–'} · {h.subjectName || '–'}
              </Text>
              <View style={{ height: spacing.lg }} />
              <StatGrid
                items={[
                  { label: 'Students', value: h.totalStudents ?? 0, icon: 'people-outline' },
                  { label: 'Submitted', value: h.submittedCount ?? 0, icon: 'cloud-upload-outline', color: theme.success },
                  { label: 'Evaluated', value: h.evaluatedCount ?? 0, icon: 'checkmark-done-outline', color: theme.primary },
                  { label: 'Pending evaluation', value: h.pendingEvaluation ?? 0, icon: 'hourglass-outline', color: theme.warning },
                ]}
              />
              <Panel title="Progress">
                <Text style={styles.muted}>Submission {h.submissionRate == null ? '–' : `${h.submissionRate}%`}</Text>
                <ProgressBar value={(h.submissionRate || 0) / 100} color={theme.success} style={{ marginBottom: spacing.md }} />
                <Text style={styles.muted}>Evaluation {h.evaluationRate == null ? '–' : `${h.evaluationRate}%`}</Text>
                <ProgressBar value={(h.evaluationRate || 0) / 100} />
              </Panel>
              <Panel title="Details">
                <KeyValue label="Assigned by" value={h.teacherName} />
                <KeyValue label="Assigned" value={fmtDate(h.assignedDate)} />
                <KeyValue label="Due" value={fmtDate(h.dueDate)} valueColor={h.overdue ? theme.danger : undefined} />
                <KeyValue label="Created by" value={h.createdByName} />
              </Panel>
              {h.description ? (
                <Panel title="Description">
                  <Text style={styles.body}>{h.description}</Text>
                </Panel>
              ) : null}
              {h.attachments?.length ? (
                <>
                  <SectionTitle title="Attachments" />
                  {h.attachments.map((a, i) => {
                    const path = typeof a === 'string' ? a : a.url || a.path;
                    const name = typeof a === 'string' ? a.split('/').pop() : a.name || a.fileName || path?.split('/').pop();
                    return (
                      <Pressable key={`${path}-${i}`} style={styles.attach} onPress={() => openLink(path)}>
                        <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
                        <Text style={styles.attachText} numberOfLines={1}>{name || 'Attachment'}</Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : null}
            </>
          )
        }
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    title: { flex: 1, color: t.text, fontSize: font.xl, fontWeight: '800' },
    muted: { color: t.textMuted, fontSize: font.md, marginBottom: 4 },
    body: { color: t.text, fontSize: font.md, lineHeight: 21 },
    attach: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: spacing.md, marginBottom: spacing.sm },
    attachText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },
  });
