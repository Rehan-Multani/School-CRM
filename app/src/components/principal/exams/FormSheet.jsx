import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../ui';
import { font, spacing } from '../../../theme';

// Bottom-sheet form: title, scrollable fields, Cancel / Save footer.
export default function FormSheet({ visible, title, onClose, onSubmit, submitTitle = 'Save', saving, children }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={saving ? undefined : onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text style={{ fontSize: font.lg, fontWeight: '800', color: theme.text, marginBottom: spacing.md }}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
            {children}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} disabled={saving} style={{ flex: 1 }} />
            <Button title={submitTitle} loading={saving} loadingTitle="Saving..." onPress={onSubmit} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
});
