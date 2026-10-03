import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { fileUrl } from '../../../lib/links';
import PagedList from '../../../components/PagedList';
import { Avatar, Badge, EmptyState, SearchBar, Segmented } from '../../../components/kit';
import { font, radius, spacing } from '../../../theme';

// Doc §6.3 — section roster: search (`q`), sort (roll / name), infinite scroll,
// plus quick actions for this section.
export default function SectionStudents() {
  const { sectionId, title } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rollNumber');

  useEffect(() => {
    if (title) navigation.setOptions({ title: String(title) });
  }, [navigation, title]);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const actions = [
    { icon: 'checkmark-done-outline', label: 'Attendance', to: { pathname: '/teacher/attendance/mark', params: { sectionId, title } }, color: '#10B981' },
    { icon: 'book-outline', label: 'Homework', to: { pathname: '/teacher/homework', params: { sectionId } }, color: '#F59E0B' },
    { icon: 'clipboard-outline', label: 'Assignments', to: { pathname: '/teacher/assignments', params: { sectionId } }, color: '#3B82F6' },
    { icon: 'folder-open-outline', label: 'Materials', to: { pathname: '/teacher/materials', params: { sectionId } }, color: '#8B5CF6' },
    { icon: 'ribbon-outline', label: 'Marks', to: '/teacher/exams', color: '#EC4899' },
  ];

  const header = (
    <View style={{ paddingTop: spacing.md, paddingBottom: spacing.sm }}>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.to)}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={a.icon} size={20} color={a.color || theme.primary} />
            </View>
            <Text style={styles.actionText} numberOfLines={1}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search student by name or admission no."
      />

      <Segmented
        value={sort}
        onChange={setSort}
        options={[
          { value: 'rollNumber', label: 'Sort by Roll No' },
          { value: 'name', label: 'Sort by Name' },
        ]}
      />
    </View>
  );

  return (
    <PagedList
      deps={[sectionId, query, sort]}
      fetchPage={(page) => teacherApi.sectionStudents(sectionId, { page, limit: 30, q: query, sort })}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      ListEmptyComponent={<EmptyState icon="person-outline" title={query ? 'No student found' : 'No students in this section'} />}
      renderItem={({ item }) => {
        const photo = fileUrl(item.photo);
        return (
          <Pressable
            onPress={() => router.push(`/teacher/student/${item.id}`)}
            style={({ pressed }) => [styles.studentCard, pressed && { opacity: 0.85 }]}
          >
            <Avatar source={photo} name={item.name} size={48} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.rollNumber ? (
                  <Badge label={`Roll ${item.rollNumber}`} tone="primary" />
                ) : null}
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                Adm: {item.admissionNumber || '—'}
                {item.gender ? ` · ${item.gender}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: `/teacher/student/${item.id}` })}
              style={({ pressed }) => [styles.profileBtn, { backgroundColor: theme.surfaceAlt }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      backgroundColor: t.surface,
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.border,
    },
    action: { alignItems: 'center', width: '19%' },
    actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionText: { fontSize: font.xs, fontWeight: '700', color: t.text, marginTop: 4 },
    studentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    studentName: { fontSize: font.md, fontWeight: '800', color: t.text },
    muted: { fontSize: font.xs, color: t.textMuted, marginTop: 2 },
    profileBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
