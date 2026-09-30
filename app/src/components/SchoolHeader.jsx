import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Home-screen header shared by every role: school logo + name (multi-line wrapping) + greeting,
// painted in the school's live accent color.
export default function SchoolHeader({ children, right }) {
  const { user, school } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.schoolRow}>
        <SchoolLogo school={school} size={42} />
        <View style={styles.schoolInfo}>
          <Text style={[styles.school, { color: theme.onPrimary }]} numberOfLines={3}>
            {school?.name || 'School'}
          </Text>
          {school?.academicSession ? (
            <Text style={[styles.session, { color: theme.onPrimary }]}>Session {school.academicSession}</Text>
          ) : null}
        </View>
        {right}
      </View>
      <Text style={[styles.greet, { color: theme.onPrimary }]}>{greeting()},</Text>
      <Text style={[styles.name, { color: theme.onPrimary }]} numberOfLines={1}>
        {user?.name || 'there'}
      </Text>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  schoolInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  school: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  session: {
    fontSize: font.xs,
    opacity: 0.85,
    marginTop: 2,
    fontWeight: '500',
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
