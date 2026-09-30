import { StyleSheet, Text, View } from 'react-native';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { font, spacing } from '../../theme';

// Subject-wise horizontal bar chart (doc §6.6). One row per subject: name,
// marks/max, grade, and a bar filled to the score — red when failed, and
// a thin marker at the passing line.
export default function SubjectBars({ subjects = [] }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  if (!subjects.length) return <Text style={styles.muted}>No subject marks.</Text>;
  return (
    <View style={{ gap: spacing.md }}>
      {subjects.map((s, i) => {
        const max = Number(s.maxMarks) || 100;
        const absent = s.attendanceStatus && s.attendanceStatus !== 'PRESENT';
        const got = Number(s.marksObtained) || 0;
        const pct = Math.max(0, Math.min(1, got / max));
        const pass = Math.max(0, Math.min(1, (Number(s.passingMarks) || 0) / max));
        const color = s.isPassed ? theme.primary : theme.danger;
        return (
          <View key={`${s.subjectId || s.subjectName}-${i}`}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {s.subjectName || 'Subject'}
              </Text>
              <Text style={[styles.score, { color: absent ? theme.textMuted : color }]}>
                {absent ? String(s.attendanceStatus).replace(/_/g, ' ') : `${s.marksObtained ?? '–'}/${max}`}
                {s.grade ? `  ${s.grade}` : ''}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
              <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: color }} />
              {pass > 0 ? <View style={[styles.passLine, { left: `${Math.round(pass * 100)}%`, backgroundColor: theme.textMuted }]} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
    name: { flex: 1, fontSize: font.md, fontWeight: '700', color: t.text },
    score: { fontSize: font.md, fontWeight: '800' },
    track: { height: 10, borderRadius: 5, overflow: 'hidden' },
    passLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
    muted: { fontSize: font.sm, color: t.textMuted },
  });
