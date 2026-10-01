import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { useAsync } from '../../../lib/useAsync';
import { fmtDateTime } from '../../../lib/format';
import { Card } from '../../../components/ui';
import { AsyncView, Badge } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';

// Opening a notice marks it read (doc §6.9).
export default function NoticeDetail() {
  const { api, scopeKey } = usePortal();
  const { id } = useLocalSearchParams();
  const styles = useStyles(makeStyles);
  const state = useAsync(() => api.notice(id), [id, scopeKey]);

  useEffect(() => {
    api.markNoticeRead(id).catch(() => {});
  }, [api, id, scopeKey]);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView state={state} skeleton={<SkeletonCards count={1} padded={false} />}>
        {(n) => (
          <Card>
            {n.pinned ? (
              <View style={{ marginBottom: spacing.sm }}>
                <Badge label="PINNED" icon="pin" />
              </View>
            ) : null}
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.muted}>
              {n.publishedByName ? `${n.publishedByName} · ` : ''}
              {fmtDateTime(n.publishAt)}
            </Text>
            <Text style={styles.body}>{n.body}</Text>
          </Card>
        )}
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    title: { fontSize: font.xl, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 4 },
    body: { fontSize: font.lg, color: t.text, marginTop: spacing.lg, lineHeight: 24 },
  });
