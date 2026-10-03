import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { useAsync } from '../../../lib/useAsync';
import { openLink } from '../../../lib/links';
import { showError } from '../../../lib/notify';
import { Card } from '../../../components/ui';
import { AsyncView, EmptyState } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

const TITLES = {
  aadhaar: 'Aadhaar Card',
  marksheet: 'Marksheets & Grades',
  birthCertificate: 'Birth Certificate',
  transferCertificate: 'Transfer Certificate (TC)',
};

const titleOf = (key) => TITLES[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

export default function Documents() {
  const theme = useTheme();
  const state = useAsync(() => studentApi.documents(), []);
  const [opening, setOpening] = useState(null);

  const open = async (doc) => {
    setOpening(doc.url);
    try {
      const { url } = await studentApi.documentUrl(doc.url);
      await openLink(url);
    } catch (e) {
      showError(e, 'Document not available');
    } finally {
      setOpening(null);
    }
  };

  return (
    <RefreshableScroll
      onRefresh={() => state.reload({ silent: true })}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}
    >
      {/* Notice Banner */}
      <View style={[styles.banner, { backgroundColor: alpha(theme.primary, theme.isDark ? 0.18 : 0.08), borderColor: alpha(theme.primary, 0.25) }]}>
        <View style={[styles.bannerIconBox, { backgroundColor: alpha(theme.primary, 0.15) }]}>
          <Ionicons name="document-attach" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>Official Student Archive</Text>
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>
            Verified certificates and official records uploaded by the school administration office.
          </Text>
        </View>
      </View>

      <AsyncView
        state={state}
        empty={{
          when: (groups) => !(groups || []).some((g) => g.count),
          view: (
            <EmptyState
              icon="document-attach-outline"
              title="No documents on file"
              message="Your school administration office will upload your verified certificates here."
            />
          ),
        }}
      >
        {(groups) =>
          groups
            .filter((g) => g.count)
            .map((g) => (
              <View key={g.key} style={{ marginBottom: spacing.lg }}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>{titleOf(g.key)}</Text>
                  <View style={[styles.countBadge, { backgroundColor: alpha(theme.primary, 0.12) }]}>
                    <Text style={[styles.countText, { color: theme.primary }]}>{g.items.length} {g.items.length === 1 ? 'file' : 'files'}</Text>
                  </View>
                </View>

                <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
                  {g.items.map((doc, idx) => (
                    <Pressable
                      key={`${g.key}-${doc.index}`}
                      onPress={() => open(doc)}
                      disabled={opening === doc.url}
                      style={({ pressed }) => [
                        styles.docRow,
                        idx !== g.items.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                        pressed && { backgroundColor: theme.surfaceAlt },
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={[styles.docIconBox, { backgroundColor: alpha('#10B981', theme.isDark ? 0.22 : 0.12) }]}>
                        <Ionicons name="document-text-outline" size={20} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docTitle, { color: theme.text }]} numberOfLines={1}>
                          {`${titleOf(g.key)} #${doc.index + 1}`}
                        </Text>
                        <Text style={[styles.docSub, { color: theme.textMuted }]}>Tap to open & download file</Text>
                      </View>
                      <View style={[styles.openBadge, { backgroundColor: alpha(theme.primary, 0.1) }]}>
                        {opening === doc.url ? null : <Ionicons name="arrow-down-outline" size={14} color={theme.primary} />}
                        <Text style={[styles.openText, { color: theme.primary }]}>{opening === doc.url ? 'Opening...' : 'View'}</Text>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              </View>
            ))
        }
      </AsyncView>
    </RefreshableScroll>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: font.sm,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerText: {
    fontSize: font.xs,
    lineHeight: 17,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: font.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: font.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  docSub: {
    fontSize: 11,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  openText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
