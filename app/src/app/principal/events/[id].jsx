import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { principalMonitoringApi as api } from '../../../api/principal/monitoring';
import { useAsync } from '../../../lib/useAsync';
import { openLink } from '../../../lib/links';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { AsyncView, Badge, SectionTitle } from '../../../components/kit';
import { SkeletonDetail } from '../../../components/Skeleton';
import { KeyValue, Panel } from '../../../components/principal/monitoring/Common';
import { EVENT_STATUS_TONE, fmtEventTime } from '../../../components/principal/monitoring/eventUtils';
import { font, spacing } from '../../../theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const state = useAsync(async () => (await api.event(id))?.data || null, [id], { refetchOnFocus: true });

  return (
    <RefreshableScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }} onRefresh={() => state.reload({ silent: true })}>
      <Stack.Screen options={{ title: 'Event' }} />
      <AsyncView state={state} skeleton={<SkeletonDetail />}>
        {(e) =>
          !e ? null : (
            <>
              <View style={styles.row}>
                <Badge label={e.category} tone="info" />
                <Badge label={e.status} tone={EVENT_STATUS_TONE[e.status] || 'muted'} />
              </View>
              <Text style={styles.title}>{e.title}</Text>
              <Panel title="When and where">
                <KeyValue label="Starts" value={fmtEventTime(e.startAt, e.allDay)} />
                <KeyValue label="Ends" value={fmtEventTime(e.endAt, e.allDay)} />
                <KeyValue label="All day" value={e.allDay ? 'Yes' : 'No'} />
                <KeyValue label="Venue" value={e.venue || '–'} />
                <KeyValue label="Coordinator" value={e.leadName || 'Not assigned'} />
                <KeyValue label="Created by" value={e.createdByName || '–'} />
              </Panel>
              {e.description ? (
                <Panel title="Description">
                  <Text style={styles.body}>{e.description}</Text>
                </Panel>
              ) : null}
              {e.audiences?.length ? (
                <Panel title="Audience">
                  <View style={styles.chips}>
                    {e.audiences.map((a, i) => (
                      <Badge key={`${i}`} label={typeof a === 'string' ? a : a.label || a.name || a.type || 'Audience'} tone="primary" />
                    ))}
                  </View>
                </Panel>
              ) : null}
              {e.attachments?.length ? (
                <>
                  <SectionTitle title="Attachments" />
                  {e.attachments.map((a, i) => {
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
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    title: { color: t.text, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.lg },
    body: { color: t.text, fontSize: font.md, lineHeight: 21 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    attach: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: spacing.md, marginBottom: spacing.sm },
    attachText: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },
  });
