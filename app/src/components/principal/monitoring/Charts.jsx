import { StyleSheet, Text, View } from 'react-native';
import { useStyles } from '../../../context/ThemeContext';
import { alpha, font, radius, spacing } from '../../../theme';

// Horizontal bars: `data = [{ label, value, text? }]`. Width is relative to `max`
// (defaults to the largest value, or 100 when `percent`).
export function BarList({ data, color, percent, format }) {
  const styles = useStyles(makeStyles);
  const max = percent ? 100 : Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    <View style={{ gap: spacing.md }}>
      {data.map((d) => {
        const v = Number(d.value) || 0;
        return (
          <View key={d.label}>
            <View style={styles.barHead}>
              <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
              <Text style={styles.barValue}>{d.text ?? (format ? format(v) : v)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, (v / max) * 100))}%`, backgroundColor: d.color || color || styles.primary.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Vertical mini column chart for a time series: `data = [{ label, value }]`.
export function TrendBars({ data, color, percent, height = 120, format }) {
  const styles = useStyles(makeStyles);
  const max = percent ? 100 : Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const first = data[0];
  const last = data[data.length - 1];
  return (
    <View>
      <View style={[styles.cols, { height }]}>
        {data.map((d, i) => {
          const v = Number(d.value) || 0;
          return (
            <View key={`${d.label}-${i}`} style={styles.colWrap}>
              <View style={[styles.col, { height: `${Math.max(3, Math.min(100, (v / max) * 100))}%`, backgroundColor: color || styles.primary.color }]} />
            </View>
          );
        })}
      </View>
      {first && last ? (
        <View style={styles.barHead}>
          <Text style={styles.axis}>{first.label}</Text>
          <Text style={styles.axis}>{last.label}{last.value !== undefined ? ` · ${format ? format(last.value) : last.value}` : ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    primary: { color: t.primary },
    barHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 4 },
    barLabel: { flex: 1, color: t.text, fontSize: font.md, fontWeight: '600' },
    barValue: { color: t.textMuted, fontSize: font.md, fontWeight: '800' },
    track: { height: 8, borderRadius: radius.pill, backgroundColor: t.surfaceAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill },
    cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingTop: spacing.sm, borderBottomWidth: 1, borderBottomColor: alpha(t.textMuted, 0.3) },
    colWrap: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    col: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    axis: { color: t.textMuted, fontSize: font.xs, marginTop: 4 },
  });
