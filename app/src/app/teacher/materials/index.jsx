import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { fmtBytes, fmtDate } from '../../../lib/format';
import { openLink } from '../../../lib/links';
import { confirm, showError, toast } from '../../../lib/notify';
import PagedList from '../../../components/PagedList';
import { EmptyState } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';

const TYPE_ICON = { pdf: 'document-text', doc: 'document', docx: 'document', ppt: 'easel', pptx: 'easel', png: 'image', jpg: 'image', jpeg: 'image' };

function ext(m) {
  return String(m.fileName || m.url || '').split('.').pop().toLowerCase();
}

export default function Materials() {
  const { sectionId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const list = useRef(null);

  const remove = async (m) => {
    const ok = await confirm('Delete material?', `"${m.title}" will be removed for students too.`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await teacherApi.deleteMaterial(m.id);
      list.current?.update((items) => items.filter((x) => x.id !== m.id));
      toast('Material deleted');
    } catch (e) {
      showError(e);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PagedList
        ref={list}
        deps={[sectionId]}
        cacheKey="teacher.materials"
        fetchPage={(page) => teacherApi.materialList({ page, limit: 20, sectionId })}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 110 }}
        ListEmptyComponent={<EmptyState icon="folder-open-outline" title="No materials yet" message="Upload notes, worksheets or slides for your students." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => openLink(item.url)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
            <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={`${TYPE_ICON[ext(item)] || 'document'}-outline`} size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {item.subjectName} · {item.sectionName} · {ext(item).toUpperCase()} {fmtBytes(item.fileSize)}
              </Text>
              <Text style={styles.muted}>{fmtDate(item.createdAt)}</Text>
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </Pressable>
          </Pressable>
        )}
      />
      <Pressable
        onPress={() => router.push({ pathname: '/teacher/materials/new', params: sectionId ? { sectionId } : {} })}
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + spacing.xl }]}
      >
        <Ionicons name="cloud-upload-outline" size={26} color={theme.onPrimary} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    icon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    fab: { position: 'absolute', right: spacing.xl, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  });
