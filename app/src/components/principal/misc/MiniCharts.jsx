import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../../../context/ThemeContext';
import { font, radius, spacing } from '../../../theme';

// Dependency-free charts for the dashboard (Views only, scale with the screen).

const num = (v) => Number(v) || 0;

/** Vertical bars. `data` = rows, `xKey` = label field, `yKey` = value field. */
export function BarChart({ data = [], xKey, yKey, color, format = (v) => String(v), height = 110 }) {
  const styles = useStyles(makeStyles);
  const max = Math.max(1, ...data.map((d) => num(d[yKey])));
  if (!data.length) return <Text style={styles.empty}>No data yet</Text>;
  return (
    <View style={styles.bars}>
      {data.map((d, i) => {
        const v = num(d[yKey]);
        return (
          <View key={`${d[xKey]}-${i}`} style={styles.barCol}>
            <Text style={styles.barVal} numberOfLines={1}>
              {format(v)}
            </Text>
            <View style={[styles.barTrack, { height }]}>
              <View style={[styles.bar, { height: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.barLbl} numberOfLines={1}>
              {String(d[xKey] ?? '')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Horizontal share rows (gender split, class strength). */
export function ShareBars({ data = [], labelKey, valueKey, colors }) {
  const styles = useStyles(makeStyles);
  const total = data.reduce((s, d) => s + num(d[valueKey]), 0);
  const max = Math.max(1, ...data.map((d) => num(d[valueKey])));
  if (!data.length) return <Text style={styles.empty}>No data yet</Text>;
  return (
    <View style={{ gap: spacing.sm }}>
      {data.map((d, i) => {
        const v = num(d[valueKey]);
        const c = colors[i % colors.length];
        return (
          <View key={`${d[labelKey]}-${i}`}>
            <View style={styles.shareHead}>
              <Text style={styles.shareLbl} numberOfLines={1}>
                {String(d[labelKey] ?? '')}
              </Text>
              <Text style={styles.shareVal}>
                {v}
                {total ? ` · ${Math.round((v / total) * 100)}%` : ''}
              </Text>
            </View>
            <View style={styles.shareTrack}>
              <View style={[styles.shareFill, { width: `${Math.max(2, (v / max) * 100)}%`, backgroundColor: c }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    empty: { color: t.textMuted, fontSize: font.sm, paddingVertical: spacing.md },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    barCol: { flex: 1, alignItems: 'center' },
    barVal: { color: t.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 2 },
    barTrack: { width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: '70%', borderRadius: 6 },
    barLbl: { color: t.textMuted, fontSize: 10, marginTop: 4, fontWeight: '600' },
    shareHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
    shareLbl: { color: t.text, fontSize: font.sm, fontWeight: '600', flex: 1 },
    shareVal: { color: t.textMuted, fontSize: font.sm, fontWeight: '700' },
    shareTrack: { height: 8, borderRadius: radius.pill, backgroundColor: t.surfaceAlt, overflow: 'hidden' },
    shareFill: { height: '100%', borderRadius: radius.pill },
  });
