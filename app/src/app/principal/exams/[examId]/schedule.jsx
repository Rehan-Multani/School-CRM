import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStyles, useTheme } from '../../../../context/ThemeContext';
import { principalExamsApi } from '../../../../api/principal/exams';
import { useAsync } from '../../../../lib/useAsync';
import { fmtDate, parseYmd } from '../../../../lib/format';
import { confirm, showError, toast } from '../../../../lib/notify';
import { Button, Card, Input } from '../../../../components/ui';
import { AsyncView, DateField, EmptyState, Select } from '../../../../components/kit';
import RefreshableScroll from '../../../../components/RefreshableScroll';
import FormSheet from '../../../../components/principal/exams/FormSheet';
import { rows } from '../../../../components/principal/exams/constants';
import { font, spacing } from '../../../../theme';

const day = (v) => (v ? String(v).slice(0, 10) : '');
const ALL = '__all__';
const NONE = [];

// Exam timetable: one slot per class / (section) / subject with date, time, room, invigilator.
export default function ExamSchedule() {
  const { examId } = useLocalSearchParams();
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const slots = useAsync(() => principalExamsApi.schedule(examId), [examId], { refetchOnFocus: true });
  const exam = useAsync(() => principalExamsApi.get(examId), [examId]);
  const subjects = useAsync(() => principalExamsApi.subjects(examId), [examId]);
  const [sheet, setSheet] = useState(null);
  const [sectionsFor, setSectionsFor] = useState({ classId: null, list: [] });
  const [saving, setSaving] = useState(false);

  const examData = exam.data?.data;
  const classOptions = useMemo(() => (examData?.classes || []).map((c) => ({ value: c.id, label: c.name })), [examData]);
  const classId = sheet?.classId;
  const sections = sectionsFor.classId === classId ? sectionsFor.list : NONE;

  const subjectOptions = useMemo(
    () => rows(subjects.data).filter((s) => !classId || s.classId === classId).map((s) => ({ value: s.subjectId, label: s.subjectName, sub: `Max ${s.maxMarks}` })),
    [subjects.data, classId],
  );
  const sectionOptions = useMemo(
    () => [{ value: ALL, label: 'All sections' }, ...sections.map((s) => ({ value: s.id, label: `Section ${s.name}` }))],
    [sections],
  );

  useEffect(() => {
    if (!classId) return undefined;
    let live = true;
    principalExamsApi
      .sections(classId)
      .then((r) => live && setSectionsFor({ classId, list: rows(r) }))
      .catch(() => live && setSectionsFor({ classId, list: [] }));
    return () => {
      live = false;
    };
  }, [classId]);
  const setF = (k) => (v) => setSheet((f) => ({ ...f, [k]: v }));
  const openAdd = () =>
    setSheet({ classId: classOptions[0]?.value || '', sectionId: ALL, subjectId: '', examDate: '', startTime: '09:00 AM', endTime: '12:00 PM', room: 'Hall 1', invigilatorName: '' });
  const openEdit = (s) =>
    setSheet({
      editing: s,
      classId: s.classId,
      sectionId: s.sectionId || ALL,
      subjectId: s.subjectId,
      examDate: day(s.examDate),
      startTime: s.startTime || '',
      endTime: s.endTime || '',
      room: s.room || '',
      invigilatorName: s.invigilatorName && s.invigilatorName !== '—' ? s.invigilatorName : '',
    });

  const save = async () => {
    if (!sheet.classId || !sheet.subjectId) return toast.warning('Select a class and a subject');
    if (!sheet.examDate) return toast.warning('Pick the exam date');
    if (!sheet.startTime.trim() || !sheet.endTime.trim()) return toast.warning('Enter start and end time (e.g. 09:00 AM)');
    const subj = rows(subjects.data).find((s) => s.classId === sheet.classId && s.subjectId === sheet.subjectId);
    const body = {
      classId: sheet.classId,
      sectionId: sheet.sectionId === ALL ? null : sheet.sectionId,
      subjectId: sheet.subjectId,
      examDate: sheet.examDate,
      startTime: sheet.startTime.trim(),
      endTime: sheet.endTime.trim(),
      room: sheet.room.trim(),
      invigilatorName: sheet.invigilatorName.trim(),
      maxMarks: subj?.maxMarks || sheet.editing?.maxMarks || 100,
    };
    setSaving(true);
    try {
      if (sheet.editing) await principalExamsApi.updateSlot(examId, sheet.editing.id, body);
      else await principalExamsApi.createSlot(examId, body);
      toast.success(sheet.editing ? 'Timetable slot updated' : 'Timetable slot added');
      setSheet(null);
      await slots.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not save timetable slot');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    const ok = await confirm('Delete slot?', `Delete the exam schedule for ${s.subjectName} (${s.className})?`, { confirmText: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await principalExamsApi.deleteSlot(examId, s.id);
      toast.success('Schedule slot removed');
      await slots.reload({ silent: true });
    } catch (e) {
      showError(e, 'Could not delete slot');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Exam Schedule' }} />
      <RefreshableScroll onRefresh={() => slots.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, flexGrow: 1 }}>
        <Button title="Add timetable slot" icon="add" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
        <AsyncView
          state={slots}
          empty={{
            when: (d) => !rows(d).length,
            view: <EmptyState icon="calendar-outline" title="No timetable slots" message="Add exam dates and time slots for each subject to share with students." />,
          }}
        >
          {(res) =>
            rows(res).map((s) => (
              <Card key={s.id} style={{ marginBottom: spacing.md }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cls}>
                      {s.className}
                      {s.sectionName && s.sectionName !== 'All Sections' ? ` · Section ${s.sectionName}` : ''}
                    </Text>
                    <Text style={styles.name}>{s.subjectName}</Text>
                  </View>
                  <Pressable onPress={() => openEdit(s)} hitSlop={10} style={styles.icon} accessibilityLabel="Edit slot">
                    <Ionicons name="create-outline" size={22} color={theme.primary} />
                  </Pressable>
                  <Pressable onPress={() => remove(s)} hitSlop={10} style={styles.icon} accessibilityLabel="Delete slot">
                    <Ionicons name="trash-outline" size={22} color={theme.danger} />
                  </Pressable>
                </View>
                <Line icon="calendar-outline" text={fmtDate(s.examDate)} styles={styles} theme={theme} />
                <Line icon="time-outline" text={`${s.startTime} – ${s.endTime}`} styles={styles} theme={theme} />
                <Line icon="location-outline" text={`${s.room || '—'} · Max ${s.maxMarks}`} styles={styles} theme={theme} />
                {s.invigilatorName && s.invigilatorName !== '—' ? <Line icon="person-outline" text={`Invigilator: ${s.invigilatorName}`} styles={styles} theme={theme} /> : null}
              </Card>
            ))
          }
        </AsyncView>
      </RefreshableScroll>

      <FormSheet
        visible={Boolean(sheet)}
        title={sheet?.editing ? 'Edit timetable slot' : 'Add timetable slot'}
        onClose={() => setSheet(null)}
        onSubmit={save}
        saving={saving}
        submitTitle={sheet?.editing ? 'Save' : 'Add slot'}
      >
        {sheet ? (
          <>
            <Select label="Class" value={sheet.classId} options={classOptions} onChange={(v) => setSheet((f) => ({ ...f, classId: v, sectionId: ALL, subjectId: '' }))} disabled={Boolean(sheet.editing)} />
            <Select label="Section (optional)" value={sheet.sectionId} options={sectionOptions} onChange={setF('sectionId')} />
            <Select label="Subject" value={sheet.subjectId} options={subjectOptions} onChange={setF('subjectId')} disabled={Boolean(sheet.editing)} />
            <DateField
              label="Exam date"
              value={sheet.examDate}
              onChange={setF('examDate')}
              minimumDate={examData?.startDate ? parseYmd(day(examData.startDate)) : undefined}
              maximumDate={examData?.endDate ? parseYmd(day(examData.endDate)) : undefined}
            />
            <Input label="Start time" required value={sheet.startTime} onChangeText={setF('startTime')} placeholder="09:00 AM" autoCapitalize="characters" />
            <Input label="End time" required value={sheet.endTime} onChangeText={setF('endTime')} placeholder="12:00 PM" autoCapitalize="characters" />
            <Input label="Room / hall" value={sheet.room} onChangeText={setF('room')} placeholder="e.g. Hall 1, Room 102" maxLength={60} />
            <Input label="Invigilator name" value={sheet.invigilatorName} onChangeText={setF('invigilatorName')} placeholder="e.g. Mr. Sharma" maxLength={80} />
          </>
        ) : null}
      </FormSheet>
    </>
  );
}

function Line({ icon, text, styles, theme }) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={16} color={theme.textMuted} />
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    cls: { fontSize: font.xs, fontWeight: '800', color: t.primary, textTransform: 'uppercase' },
    name: { fontSize: font.lg, fontWeight: '700', color: t.text, marginTop: 2 },
    icon: { padding: spacing.sm },
    line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
    lineText: { fontSize: font.md, color: t.text },
  });
