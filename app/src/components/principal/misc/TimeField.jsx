import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../ui';
import { FieldLabel } from '../../kit';
import { fmtHM } from '../../../lib/format';
import { font, radius, spacing } from '../../../theme';

const pad = (n) => String(n).padStart(2, '0');

/** Time field bound to an "HH:MM" (24h) string. */
export default function TimeField({ label, value, onChange, error }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = (() => {
    const d = new Date();
    if (/^\d{1,2}:\d{2}$/.test(value || '')) {
      const [h, m] = value.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  })();
  const onPick = (event, date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
  };
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Time'}${value ? `: ${fmtHM(value)}` : ''}`}
        style={{
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderWidth: 1.5,
          borderColor: error ? theme.danger : theme.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          backgroundColor: theme.surfaceAlt,
        }}
      >
        <Text style={{ flex: 1, fontSize: font.lg, color: value ? theme.text : theme.textMuted }}>{value ? fmtHM(value) : 'Pick a time'}</Text>
        <Ionicons name="time-outline" size={20} color={theme.textMuted} />
      </Pressable>
      {error ? <Text style={{ color: theme.danger, fontSize: font.sm, marginTop: spacing.xs }}>{error}</Text> : null}
      {open ? (
        <View>
          <DateTimePicker
            value={current}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            accentColor={theme.primary}
            themeVariant={theme.isDark ? 'dark' : 'light'}
            onChange={onPick}
          />
          {Platform.OS === 'ios' ? <Button title="Done" variant="secondary" onPress={() => setOpen(false)} /> : null}
        </View>
      ) : null}
    </View>
  );
}
