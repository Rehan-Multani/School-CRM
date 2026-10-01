import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { font, spacing } from '../theme';
import { SchoolLogo } from './Logos';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Persistent sticky header title for the Home tab across all role tab bars
export function HomeHeaderTitle() {
  const { school } = useAuth();
  const theme = useTheme();
  return (
    <View style={styles.homeHeaderTitleRow}>
      <SchoolLogo school={school} size={32} />
      <View style={styles.homeHeaderTitleInfo}>
        <Text style={[styles.schoolTitle, { color: theme.onPrimary }]} numberOfLines={1}>
          {school?.name || 'School'}
        </Text>
        {school?.academicSession ? (
          <Text style={[styles.sessionTitle, { color: theme.onPrimary }]}>
            Session {school.academicSession}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Hero banner shown on Home screen below the persistent sticky header
export default function SchoolHeader({ children }) {
  const { user } = useAuth();
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <Text style={[styles.greet, { color: theme.onPrimary }]}>{greeting()},</Text>
      <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1}>
        {user?.name || 'there'}
      </Text>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  homeHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
  },
  homeHeaderTitleInfo: {
    flexShrink: 1,
  },
  schoolTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sessionTitle: {
    fontSize: 10,
    opacity: 0.85,
    marginTop: 1,
    fontWeight: '500',
  },
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greet: {
    fontSize: font.md,
    opacity: 0.85,
  },
  name: {
    fontSize: font.xxl,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
  },
});

