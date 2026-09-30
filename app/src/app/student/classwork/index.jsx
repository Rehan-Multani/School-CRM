import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStyles } from '../../../context/ThemeContext';
import { studentApi } from '../../../api/student';
import { fmtDate } from '../../../lib/format';
import PagedList from '../../../components/PagedList';
import { EmptyState, StatusBadge } from '../../../components/kit';
import { SkeletonCards } from '../../../components/Skeleton';
import { font, radius, spacing } from '../../../theme';

// Read-only work your teachers published to your section.
export default function ClassworkList() {
  const styles = useStyles(makeStyles);
  return (
    <PagedList
      fetchPage={(page) => studentApi.classworkList({ page, limit: 20 })}
      skeleton={<SkeletonCards padded={false} />}
      contentContainerStyle={{ paddingTop: spacing.md }}
      ListEmptyComponent={<EmptyState icon="clipboard-outline" title="No classwork yet" />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/student/classwork/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <View style={styles.row}>
            <Text style={styles.subject}>{item.subjectName || 'General'}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.muted}>
            {fmtDate(item.assignedDate)}
            {item.dueDate ? ` → ${fmtDate(item.dueDate)}` : ''}
            {item.maxMarks ? ` · ${item.maxMarks} marks` : ''}
            {item.teacherName ? ` · ${item.teacherName}` : ''}
          </Text>
        </Pressable>
      )}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: t.border },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    subject: { fontSize: font.sm, fontWeight: '800', color: t.primary, flex: 1 },
    title: { fontSize: font.lg, fontWeight: '800', color: t.text, marginTop: 4 },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: spacing.sm },
  });
