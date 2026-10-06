import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../../../context/ThemeContext';
import { StatCard } from '../../kit';
import { font, spacing } from '../../../theme';

// Two-per-row grid of StatCards: `items = [{ label, value, icon, color }]`.
export function StatGrid({ items }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
      {items.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} style={{ flexBasis: '47%', flexGrow: 1 }} />
      ))}
    </View>
  );
}

// Titled card section used for charts / summaries.
export function Panel({ title, children, style }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.panel, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function KeyValue({ label, value, valueColor }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{label}</Text>
      <Text style={[styles.v, valueColor ? { color: valueColor } : null]}>{value ?? '–'}</Text>
    </View>
  );
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const makeStyles = (t) =>
  StyleSheet.create({
    panel: { backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: spacing.lg, marginBottom: spacing.lg },
    title: { color: t.text, fontSize: font.md, fontWeight: '800', marginBottom: spacing.md },
    kv: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 6 },
    k: { color: t.textMuted, fontSize: font.md },
    v: { flex: 1, textAlign: 'right', color: t.text, fontSize: font.md, fontWeight: '700' },
  });
