import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../../context/ThemeContext';
import { Button } from '../../ui';
import { TextArea } from '../../kit';
import { font, spacing } from '../../../theme';

// Bottom sheet that asks for a rejection reason. `onSubmit(reason)` may be async;
// the sheet closes (onClose) once it resolves, and stays open if it throws.
export default function RejectModal({ visible, title = 'Reject leave request', onClose, onSubmit }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(reason.trim());
      setReason('');
      onClose();
    } catch {
      // the caller already showed the error
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Give the applicant a reason for rejecting this request.</Text>
          <TextArea value={reason} onChangeText={setReason} placeholder="e.g. Insufficient coverage during the exam term" maxLength={500} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} disabled={busy} style={{ flex: 1 }} />
            <Button title="Reject" variant="danger" onPress={submit} loading={busy} loadingTitle="Rejecting..." style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    sheet: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg },
    title: { color: t.text, fontSize: font.lg, fontWeight: '800', marginBottom: 4 },
    hint: { color: t.textMuted, fontSize: font.md, marginBottom: spacing.md },
  });
