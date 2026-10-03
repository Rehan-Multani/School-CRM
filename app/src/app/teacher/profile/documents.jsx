import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { openLink } from '../../../lib/links';
import { showError } from '../../../lib/notify';
import { Card } from '../../../components/ui';
import { AsyncView, EmptyState } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

const GROUPS = [
  { key: 'aadhaar', title: 'Aadhaar Card' },
  { key: 'pan', title: 'PAN Card' },
  { key: 'qualificationCertificates', title: 'Degree & Qualification Certificates' },
  { key: 'others', title: 'Other Verification Records' },
];

const nameOf = (d) => (typeof d === 'string' ? d.split('/').pop() : d?.name || d?.originalName || 'Document');
const urlOf = (d) => (typeof d === 'string' ? d : d?.url || d?.path || '');

export default function TeacherDocuments() {
  const theme = useTheme();
  const state = useAsync(() => teacherApi.documents(), []);

  const open = async (doc) => {
    try {
      await openLink(urlOf(doc));
    } catch (e) {
      showError(e, 'Could not open document');
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
          <Text style={[styles.bannerTitle, { color: theme.text }]}>Official Faculty Archive</Text>
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>
            Verified KYC, qualification and appointment credentials uploaded by the school administrative office.
          </Text>
        </View>
      </View>

      <AsyncView
        state={state}
        empty={{
          when: (d) => GROUPS.every((g) => !d?.[g.key]?.length),
          view: (
            <EmptyState
              icon="document-attach-outline"
              title="No documents on file"
              message="Your school administrative HR will upload your verified credentials here."
            />
          ),
        }}
      >
        {(d) =>
          GROUPS.filter((g) => d[g.key]?.length).map((g) => (
            <View key={g.key} style={{ marginBottom: spacing.lg }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{g.title}</Text>
                <View style={[styles.countBadge, { backgroundColor: alpha(theme.primary, 0.12) }]}>
                  <Text style={[styles.countText, { color: theme.primary }]}>
                    {d[g.key].length} {d[g.key].length === 1 ? 'file' : 'files'}
                  </Text>
                </View>
              </View>

              <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
                {d[g.key].map((doc, idx) => (
                  <Pressable
                    key={`${g.key}-${idx}`}
                    onPress={() => open(doc)}
                    style={({ pressed }) => [
                      styles.docRow,
                      idx !== d[g.key].length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                      pressed && { backgroundColor: theme.surfaceAlt },
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={[styles.docIconBox, { backgroundColor: alpha('#3B82F6', theme.isDark ? 0.22 : 0.12) }]}>
                      <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTitle, { color: theme.text }]} numberOfLines={1}>
                        {nameOf(doc)}
                      </Text>
                      <Text style={[styles.docSub, { color: theme.textMuted }]}>Tap to view file</Text>
                    </View>
                    <View style={[styles.openBadge, { backgroundColor: alpha(theme.primary, 0.1) }]}>
                      <Ionicons name="arrow-down-outline" size={14} color={theme.primary} />
                      <Text style={[styles.openText, { color: theme.primary }]}>View</Text>
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
