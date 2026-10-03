import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useParent } from '../../context/ParentContext';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { fileUrl } from '../../lib/links';
import { withPrefix } from '../../lib/format';
import { Avatar } from '../kit';
import { alpha, font, radius, spacing } from '../../theme';

export const childClassLine = (c) =>
  [c?.className ? withPrefix('Class', `${c.className}${c.sectionName ? `-${c.sectionName}` : ''}`) : '', c?.rollNumber ? `Roll ${c.rollNumber}` : '']
    .filter(Boolean)
    .join(' · ');

// App-bar pill "[avatar] Aarav ▾" (doc 03 §1). Tapping it opens a bottom sheet
// of the parent's children; picking one switches every child screen. With a
// single child there is nothing to switch, so it is just the name.
export default function ChildSwitcher({ onDark = true }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { children, child, selectChild } = useParent();
  const [open, setOpen] = useState(false);
  if (!child) return null;

  const many = children.length > 1;
  const fg = onDark ? theme.onPrimary : theme.text;
  const first = String(child.name || '').split(' ')[0] || 'Child';

  return (
    <>
      <Pressable
        disabled={!many}
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={many ? `Selected child ${child.name}. Tap to switch child` : `Child ${child.name}`}
        style={({ pressed }) => [styles.pill, { backgroundColor: onDark ? alpha('#FFFFFF', 0.18) : theme.surfaceAlt }, pressed && { opacity: 0.75 }]}
      >
        <Avatar source={fileUrl(child.photo)} name={child.name} size={26} />
        <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>
          {first}
        </Text>
        {many ? <Ionicons name="chevron-down" size={16} color={fg} /> : null}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Select child</Text>
          {children.map((c) => {
            const active = c.childId === child.childId;
            return (
              <Pressable
                key={c.childId}
                onPress={() => {
                  selectChild(c.childId);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.row, active && { backgroundColor: theme.primarySoft, borderColor: alpha(theme.primary, 0.35) }, pressed && { opacity: 0.8 }]}
              >
                <Avatar source={fileUrl(c.photo)} name={c.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {childClassLine(c) || c.admissionNumber}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, height: 34, borderRadius: radius.pill, maxWidth: 170 },
    pillText: { fontSize: font.md, fontWeight: '700', flexShrink: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginBottom: spacing.md },
    sheetTitle: { fontSize: font.lg, fontWeight: '800', color: t.text, marginBottom: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, marginBottom: spacing.sm },
    name: { fontSize: font.lg, fontWeight: '700', color: t.text },
    sub: { fontSize: font.sm, color: t.textMuted, marginTop: 2 },
  });
