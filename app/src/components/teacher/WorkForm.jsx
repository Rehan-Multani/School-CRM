import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { sectionOptions, subjectOptions, useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacher';
import { parseYmd, ymd } from '../../lib/format';
import { showError, toast } from '../../lib/notify';
import { useKeyboard } from '../../lib/useKeyboard';
import { Button, Card, Input } from '../ui';
import { Chip, DateField, EmptyState, ErrorView, FieldLabel, Select, TextArea } from '../kit';
import { spacing } from '../../theme';
import { SkeletonForm } from '../Skeleton';

// Create / edit form shared by Homework and Assignments (doc §6.5).
// Section + Subject pickers only offer the teacher's own teaching slots, so a
// forbidden pair can't even be chosen (the backend re-checks anyway).
const KINDS = {
  homework: { create: teacherApi.createHomework, update: teacherApi.updateHomework, noun: 'Homework' },
  assignment: { create: teacherApi.createAssignment, update: teacherApi.updateAssignment, noun: 'Assignment' },
};

export default function WorkForm({ kind, initial, presetSectionId }) {
  const theme = useTheme();
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const cfg = KINDS[kind];
  const isEdit = Boolean(initial?.id);
  const { slots, loadSlots } = useTeacher();
  const [slotErr, setSlotErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    instructions: initial?.instructions || '',
    sectionId: initial?.sectionId || presetSectionId || null,
    subjectId: initial?.subjectId || null,
    assignedDate: initial?.assignedDate ? ymd(new Date(initial.assignedDate)) : ymd(),
    dueDate: initial?.dueDate ? ymd(new Date(initial.dueDate)) : '',
    maxMarks: initial?.maxMarks != null ? String(initial.maxMarks) : '100',
    status: initial?.status || 'PUBLISHED',
    link: initial?.attachments?.[0]?.url || '',
  }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    loadSlots().catch(setSlotErr);
  }, [loadSlots]);

  const sections = useMemo(() => sectionOptions(slots), [slots]);
  const subjects = useMemo(() => subjectOptions(slots, form.sectionId), [slots, form.sectionId]);

  // Auto-pick when there is only one choice; drop a subject that no longer fits.
  useEffect(() => {
    if (!form.sectionId && sections.length === 1) set('sectionId')(sections[0].value);
  }, [sections, form.sectionId]);
  useEffect(() => {
    if (form.subjectId && !subjects.some((s) => s.value === form.subjectId)) set('subjectId')(null);
    if (!form.subjectId && subjects.length === 1) set('subjectId')(subjects[0].value);
  }, [subjects, form.subjectId]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.sectionId) e.sectionId = 'Pick a section';
    if (!form.subjectId) e.subjectId = 'Pick a subject';
    if (!form.dueDate) e.dueDate = 'Pick a due date';
    else if (form.dueDate < form.assignedDate) e.dueDate = 'Due date must be on or after the assigned date';
    if (kind === 'assignment') {
      const m = Number(form.maxMarks);
      if (!Number.isFinite(m) || m < 1 || m > 1000) e.maxMarks = 'Max marks must be 1–1000';
    }
    if (form.link.trim() && !/^https?:\/\/\S+$/i.test(form.link.trim())) e.link = 'Must be a full http(s):// link';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      assignedDate: form.assignedDate,
      dueDate: form.dueDate,
      attachments: form.link.trim() ? [{ name: 'Link', url: form.link.trim() }] : [],
    };
    if (kind === 'assignment') {
      body.maxMarks = Number(form.maxMarks);
      body.instructions = form.instructions.trim();
      body.status = form.status;
    }
    setSaving(true);
    try {
      if (isEdit) await cfg.update(initial.id, body);
      else await cfg.create(body);
      toast(isEdit ? `${cfg.noun} updated` : `${cfg.noun} created`);
      router.back();
    } catch (e) {
      showError(e, 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (slotErr && !slots) return <ErrorView error={slotErr} onRetry={() => loadSlots(true).then(() => setSlotErr(null)).catch(setSlotErr)} />;
  if (!slots) return <SkeletonForm fields={7} />;
  if (!sections.length) {
    return <EmptyState icon="book-outline" title="No subjects assigned" message="You can create work once you are assigned a subject in a section." />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(80, keyboardVisible ? keyboardHeight + 80 : 80),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Section 1: Basic Information */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
            1. Basic Information
          </Text>
          <Card>
            <Input
              label="Title"
              required
              value={form.title}
              onChangeText={set('title')}
              maxLength={200}
              error={errors.title}
              placeholder="e.g. Chapter 3 Quadratic Equations"
            />
            <TextArea
              label="Description"
              value={form.description}
              onChangeText={set('description')}
              maxLength={5000}
              placeholder="What should students do? Provide full context..."
            />
          </Card>
        </View>

        {/* Section 2: Class & Subject */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
            2. Class & Subject
          </Text>
          <Card>
            <Select label="Section" value={form.sectionId} options={sections} onChange={set('sectionId')} error={errors.sectionId} />
            <Select
              label="Subject"
              value={form.subjectId}
              options={subjects}
              onChange={set('subjectId')}
              error={errors.subjectId}
              disabled={!form.sectionId}
              placeholder={form.sectionId ? 'Select subject' : 'Pick a section first'}
            />
          </Card>
        </View>

        {/* Section 3: Instructions (Assignments) */}
        {kind === 'assignment' ? (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
              3. Instructions & Guidelines
            </Text>
            <Card>
              <TextArea
                label="Instructions (optional)"
                value={form.instructions}
                onChangeText={set('instructions')}
                maxLength={5000}
                placeholder="Specific submission requirements, formatting guidelines..."
              />
            </Card>
          </View>
        ) : null}

        {/* Section 4: Deadline & Marks */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
            {kind === 'assignment' ? '4. Deadline & Grading' : '3. Schedule & Deadline'}
          </Text>
          <Card>
            <DateField label="Assigned Date" value={form.assignedDate} onChange={set('assignedDate')} />
            <DateField
              label="Due Date"
              value={form.dueDate}
              onChange={set('dueDate')}
              minimumDate={parseYmd(form.assignedDate)}
              error={errors.dueDate}
            />
            {kind === 'assignment' ? (
              <Input
                label="Maximum Marks"
                value={form.maxMarks}
                onChangeText={(v) => set('maxMarks')(v.replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                error={errors.maxMarks}
                placeholder="100"
              />
            ) : null}
          </Card>
        </View>

        {/* Section 5: Attachments & Resources */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
            {kind === 'assignment' ? '5. Attachments & Resources' : '4. Reference Material'}
          </Text>
          <Card>
            <Input
              label="Resource / Document Link (optional)"
              value={form.link}
              onChangeText={set('link')}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://drive.google.com/... or web resource"
              maxLength={1000}
              error={errors.link}
            />
          </Card>
        </View>

        {/* Section 6: Publishing (Assignments) */}
        {kind === 'assignment' ? (
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs }}>
              6. Publishing Status
            </Text>
            <Card>
              <FieldLabel>Status</FieldLabel>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {['DRAFT', 'PUBLISHED', ...(isEdit ? ['CLOSED'] : [])].map((s) => (
                  <Chip key={s} label={s} active={form.status === s} onPress={() => set('status')(s)} />
                ))}
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 8 }}>
                {form.status === 'DRAFT'
                  ? 'Draft assignments are visible only to you until published.'
                  : 'Published assignments are immediately visible to students and parents.'}
              </Text>
            </Card>
          </View>
        ) : null}

        <Button
          title={isEdit ? 'Save Changes' : `Create ${cfg.noun}`}
          icon="checkmark-circle-outline"
          loading={saving}
          loadingTitle={saving ? 'Saving...' : undefined}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
