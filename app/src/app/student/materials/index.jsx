import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import { fmtBytes, fmtDate } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { showError } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { EmptyState } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { font, radius, spacing } from '../../../theme';

const TYPE_ICON = { pdf: 'document-text', doc: 'document', docx: 'document', ppt: 'easel', pptx: 'easel', png: 'image', jpg: 'image', jpeg: 'image' };
const ext = (m) => String(m.fileType || m.fileName || '').split('.').pop().toLowerCase();

// Doc §6.4 — the download URL is short-lived: fetch it at tap time, never cache it.
export default function Materials() {
  const { api, scopeKey } = usePortal();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [opening, setOpening] = useState(null);

  const open = async (m) => {
    setOpening(m.id);
    try {
      const { url } = await api.materialUrl(m.id);
      await openLink(url);
    } catch (e) {
      showError(e, 'Could not open');
    } finally {
      setOpening(null);
    }
  };

  return (
    <PagedList
      deps={[scopeKey]}
      fetchPage={(page) => api.materialList({ page, limit: 20 })}
      skeleton={<SkeletonCards padded={false} />}
      contentContainerStyle={{ paddingTop: spacing.md }}
      ListEmptyComponent={<EmptyState icon="folder-open-outline" title="No study material yet" message="Notes and slides from your teachers show up here." />}
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} disabled={opening === item.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name={`${TYPE_ICON[ext(item)] || 'document'}-outline`} size={22} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {[item.subjectName, item.teacherName, ext(item).toUpperCase(), fmtBytes(item.fileSize)].filter(Boolean).join(' · ')}
            </Text>
            {item.description ? (
              <Text style={styles.muted} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.muted}>{fmtDate(item.createdAt)}</Text>
          </View>
          {opening === item.id ? <Text style={[styles.muted, { color: theme.primary, fontWeight: '700' }]}>Opening...</Text> : <Ionicons name="download-outline" size={20} color={theme.primary} />}
        </Pressable>
      )}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
  });
