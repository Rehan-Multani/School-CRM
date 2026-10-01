import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { sectionOptions, subjectOptions, useTeacher } from '../../../context/TeacherContext';
import { teacherApi } from '../../../api/teacher';
import { fmtBytes } from '../../../lib/format';
import { showError, toast } from '../../../lib/notify';
import { useKeyboard } from '../../../lib/useKeyboard';
import { Button, Input } from '../../../components/ui';
import { Chip, EmptyState, ErrorView, FieldLabel, ProgressBar, Select, TextArea } from '../../../components/kit';
import { radius, spacing } from '../../../theme';
import { SkeletonForm } from '../../../components/Skeleton';

// Doc §6.5 — multipart upload, field `file`; pdf/doc/docx/ppt/pptx/png/jpg,
// max 10 MB. The server re-checks the real bytes (a renamed file is refused).
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
const PICKER_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
];

export default function NewMaterial() {
  const { sectionId: preset } = useLocalSearchParams();
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const { slots, loadSlots } = useTeacher();
  const [slotErr, setSlotErr] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', sectionId: preset || null, subjectId: null, visibility: 'SECTION' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    loadSlots().catch(setSlotErr);
  }, [loadSlots]);
  const sections = useMemo(() => sectionOptions(slots), [slots]);
  const subjects = useMemo(() => subjectOptions(slots, form.sectionId), [slots, form.sectionId]);
  useEffect(() => {
    if (form.subjectId && !subjects.some((s) => s.value === form.subjectId)) set('subjectId')(null);
    if (!form.subjectId && subjects.length === 1) set('subjectId')(subjects[0].value);
  }, [subjects, form.subjectId]);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: PICKER_TYPES, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const extension = String(a.name || '').split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(extension)) {
      setErrors((e) => ({ ...e, file: 'Allowed: PDF, Word, PowerPoint, PNG, JPG' }));
      return;
    }
    if (a.size && a.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, file: 'File is larger than 10 MB' }));
      return;
    }
    setErrors((e) => ({ ...e, file: undefined }));
    setFile(a);
    if (!form.title) set('title')(String(a.name).replace(/\.[^.]+$/, '').slice(0, 120));
  };

  const submit = async () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.sectionId) e.sectionId = 'Pick a section';
    if (!form.subjectId) e.subjectId = 'Pick a subject';
    if (!file) e.file = 'Choose a file';
    setErrors(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('sectionId', form.sectionId);
    fd.append('subjectId', form.subjectId);
    fd.append('visibility', form.visibility);
    fd.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
    setProgress(0);
    try {
      await teacherApi.createMaterial(fd, setProgress);
      toast('Material uploaded');
      router.back();
    } catch (err) {
      showError(err, 'Upload failed');
      setProgress(null);
    }
  };

  if (slotErr && !slots) return <ErrorView error={slotErr} onRetry={() => loadSlots(true).then(() => setSlotErr(null)).catch(setSlotErr)} />;
  if (!slots) return <SkeletonForm fields={5} />;
  if (!sections.length) return <EmptyState icon="folder-open-outline" title="No subjects assigned" />;

  const uploading = progress !== null;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(60, keyboardVisible ? keyboardHeight + 80 : 60),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <FieldLabel>File</FieldLabel>
        <Pressable
          onPress={pick}
          disabled={uploading}
          style={{
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: errors.file ? theme.danger : theme.primary,
            borderRadius: radius.lg,
            padding: spacing.lg,
            alignItems: 'center',
            backgroundColor: theme.primarySoft,
            marginBottom: errors.file ? spacing.xs : spacing.lg,
          }}
        >
          <Ionicons name={file ? 'document-attach' : 'cloud-upload-outline'} size={30} color={theme.primary} />
          <Text style={{ color: theme.text, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' }} numberOfLines={2}>
            {file ? file.name : 'Tap to choose a file'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
            {file ? fmtBytes(file.size) : 'PDF, Word, PowerPoint, PNG, JPG · max 10 MB'}
          </Text>
        </Pressable>
        {errors.file ? <Text style={{ color: theme.danger, fontSize: 12, marginBottom: spacing.lg }}>{errors.file}</Text> : null}

        <Input label="Title" value={form.title} onChangeText={set('title')} maxLength={200} error={errors.title} placeholder="e.g. Chapter 3 notes" />
        <Select label="Section" value={form.sectionId} options={sections} onChange={set('sectionId')} error={errors.sectionId} />
        <Select label="Subject" value={form.subjectId} options={subjects} onChange={set('subjectId')} error={errors.subjectId} disabled={!form.sectionId} />
        <TextArea label="Description (optional)" value={form.description} onChangeText={set('description')} maxLength={2000} placeholder="What this material covers" />
        <FieldLabel>Visible to</FieldLabel>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
          <Chip label="This section" active={form.visibility === 'SECTION'} onPress={() => set('visibility')('SECTION')} />
          <Chip label="Whole class" active={form.visibility === 'CLASS'} onPress={() => set('visibility')('CLASS')} />
        </View>
        {uploading ? (
          <View style={{ marginBottom: spacing.lg }}>
            <ProgressBar value={progress} />
            <Text style={{ color: theme.textMuted, marginTop: 6, textAlign: 'center' }}>Uploading… {Math.round(progress * 100)}%</Text>
          </View>
        ) : null}
        <Button title="Upload" icon="cloud-upload-outline" loading={uploading} loadingTitle="Uploading..." onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
