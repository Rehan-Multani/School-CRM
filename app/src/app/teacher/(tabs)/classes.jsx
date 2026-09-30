import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { AsyncView, Badge, EmptyState, SearchBar } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { SkeletonList } from '../../../components/Skeleton';
import NetworkState from '../../../components/NetworkState';
import { withPrefix } from '../../../lib/format';

// Doc §6.3 — only ASSIGNED classes come back. Tap a class to load its
// sections; tap a section to open its roster.
function ClassCard({ cls }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState(null);
  const [err, setErr] = useState(null);

  const loadSections = async () => {
    try {
      setErr(null);
      setSections(await teacherApi.classSections(cls.id));
    } catch (e) {
      setErr(e);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !sections) loadSections();
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.head}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <Text style={{ color: theme.primary, fontWeight: '800', fontSize: font.md }}>
            {(cls.name || '?').replace(/class\s*/i, '').slice(0, 3)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{cls.name}</Text>
          <Text style={styles.muted}>
            {cls.sectionCount} section{cls.sectionCount === 1 ? '' : 's'} · {cls.studentCount} students
          </Text>
        </View>
        <View style={[styles.chevronBox, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.sections}>
          {err ? <NetworkState compact error={err} onRetry={loadSections} /> : null}
          {!sections && !err ? <SkeletonList count={2} icon={false} padded={false} /> : null}
          {(sections || []).map((s) => (
            <View key={s.id} style={styles.sectionCard}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/teacher/section/[sectionId]',
                    params: { sectionId: s.id, title: `${cls.name} - ${s.name}` },
                  })
                }
                style={({ pressed }) => [styles.sectionHead, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sectionName}>Section {s.name}</Text>
                    {s.isClassTeacher ? <Badge label="CLASS TEACHER" tone="success" /> : null}
                  </View>
                  <Text style={styles.muted}>
                    {s.studentCount ?? 0} students{s.roomNumber ? ` · ${withPrefix('Room', s.roomNumber)}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>

              {/* Quick Actions Row for this Section */}
              <View style={styles.sectionActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/teacher/attendance/mark',
                      params: { sectionId: s.id, title: `${cls.name} - ${s.name}` },
                    })
                  }
                  style={({ pressed }) => [
                    styles.secBtn,
                    { backgroundColor: theme.surfaceAlt },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons name="checkmark-done" size={14} color="#10B981" />
                  <Text style={[styles.secBtnText, { color: theme.text }]}>Attendance</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/teacher/section/[sectionId]',
                      params: { sectionId: s.id, title: `${cls.name} - ${s.name}` },
                    })
                  }
                  style={({ pressed }) => [
                    styles.secBtn,
                    { backgroundColor: theme.surfaceAlt },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons name="people-outline" size={14} color={theme.primary} />
                  <Text style={[styles.secBtnText, { color: theme.text }]}>Students</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/teacher/homework',
                      params: { sectionId: s.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.secBtn,
                    { backgroundColor: theme.surfaceAlt },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Ionicons name="book-outline" size={14} color="#F59E0B" />
                  <Text style={[styles.secBtnText, { color: theme.text }]}>Work</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TeacherClasses() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CLASS_TEACHER'
  const state = useAsync(() => teacherApi.classes(), []);

  const filteredClasses = (state.data || []).filter((c) => {
    const matchSearch =
      !search.trim() ||
      (c.name || '').toLowerCase().includes(search.trim().toLowerCase());
    return matchSearch;
  });

  return (
    <RefreshableScroll
      onRefresh={() => state.reload({ silent: true })}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, flexGrow: 1 }}
    >
      {/* Search Bar */}
      <View style={{ marginBottom: spacing.md }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search assigned classes..."
        />
      </View>

      <AsyncView
        skeleton={<SkeletonList count={5} padded={false} />}
        state={state}
        empty={{
          when: (d) => !d?.length,
          view: (
            <EmptyState
              icon="people-outline"
              title="No classes assigned"
              message="Ask your school admin to assign you to a class or subject."
            />
          ),
        }}
      >
        {() =>
          filteredClasses.length ? (
            filteredClasses.map((c) => <ClassCard key={c.id} cls={c} />)
          ) : (
            <EmptyState
              icon="search-outline"
              title="No matching classes"
              message="Try searching for a different class name."
            />
          )
        }
      </AsyncView>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      marginBottom: spacing.md,
      borderWidth: t.isDark ? 1 : 0,
      borderColor: t.border,
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: t.isDark ? 0 : 1,
      overflow: 'hidden',
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: font.lg, fontWeight: '800', color: t.text },
    muted: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
    chevronBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sections: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    sectionCard: {
      backgroundColor: t.surfaceAlt,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.xs,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionName: { fontSize: font.md, fontWeight: '700', color: t.text },
    sectionActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    secBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    secBtnText: {
      fontSize: font.xs,
      fontWeight: '700',
    },
  });
