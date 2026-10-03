import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useStyles, useTheme } from '../../../context/ThemeContext';
import { usePortal } from '../../../context/PortalScope';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, radius, spacing } from '../../../theme';
import { alpha } from '../../../theme/colors';

const TILES = [
  { icon: 'calendar-outline', label: 'Timetable', sub: 'Weekly schedule & rooms', to: 'timetable', color: '#3b82f6' },
  { icon: 'book-outline', label: 'Homework', sub: 'View & submit tasks', readOnlySub: 'Tasks & submission status', to: 'homework', color: '#f59e0b' },
  { icon: 'clipboard-outline', label: 'Classwork', sub: 'Daily notes & exercises', to: 'classwork', color: '#10b981' },
  { icon: 'folder-open-outline', label: 'Study Material', sub: 'Notes, PDFs & slides', to: 'materials', color: '#8b5cf6' },
  { icon: 'create-outline', label: 'Exams', sub: 'Date sheets & syllabus', to: 'exams', color: '#ec4899' },
  { icon: 'ribbon-outline', label: 'Results', sub: 'Declared exam marks', to: 'results', color: '#6366f1' },
  { icon: 'document-text-outline', label: 'Report Card', sub: 'Cumulative performance', to: 'report-card', color: '#14b8a6' },
  { icon: 'wallet-outline', label: 'Fee Invoices', sub: 'Dues & receipts', to: 'fees', color: '#f97316' },
];

export default function Academics() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { base, readOnly } = usePortal();

  return (
    <RefreshableScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}>
      <View style={styles.grid}>
        {TILES.map((t) => {
          const accentColor = t.color || theme.primary;
          return (
            <Pressable
              key={t.to}
              onPress={() => router.push(`${base}/${t.to}`)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}, ${(readOnly && t.readOnlySub) || t.sub}`}
            >
              <View style={styles.tileTop}>
                <View style={[styles.iconBox, { backgroundColor: alpha(accentColor, 0.12) }]}>
                  <Ionicons name={t.icon} size={24} color={accentColor} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {t.label}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {(readOnly && t.readOnlySub) || t.sub}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </RefreshableScroll>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: {
      width: '47.5%',
      minHeight: 128,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      justifyContent: 'space-between',
      shadowColor: t.shadow,
      shadowOpacity: t.isDark ? 0 : 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    tileTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: font.md,
      fontWeight: '800',
      color: t.text,
      marginTop: spacing.xs,
    },
    sub: {
      fontSize: font.xs,
      color: t.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
  });
