import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { teacherApi } from '../../../api/teacher';
import { useAsync } from '../../../lib/useAsync';
import { Card } from '../../../components/ui';
import { AsyncView, EmptyState, ListRow, SectionTitle } from '../../../components/kit';
import RefreshableScroll from '../../../components/RefreshableScroll';
import { font, spacing } from '../../../theme';

// Exam → my subjects → section → marks sheet. `subjects` already lists, per
// subject, only the sections where THIS teacher teaches it.
export default function ExamDetail() {
  const { examId, name } = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  useEffect(() => {
    if (name) navigation.setOptions({ title: String(name) });
  }, [navigation, name]);

  const state = useAsync(() => teacherApi.examSubjects(examId), [examId]);

  return (
    <RefreshableScroll onRefresh={() => state.reload({ silent: true })} contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}>
      <AsyncView
        state={state}
        empty={{ when: (d) => !d?.length, view: <EmptyState icon="ribbon-outline" title="No subjects for you" message="You don't teach any subject in this exam." /> }}
      >
        {(subjects) =>
          subjects.map((s) => (
            <View key={s.id}>
              <SectionTitle
                title={`${s.subjectName}${s.className ? ` · ${s.className}` : ''}`}
                right={<Text style={{ color: theme.textMuted, fontSize: font.sm }}>Max {s.maxMarks} · Pass {s.passingMarks}</Text>}
              />
              <Card style={{ paddingVertical: 0 }}>
                {(s.sections || []).map((sec) => (
                  <ListRow
                    key={sec.id}
                    icon="create-outline"
                    title={`Section ${sec.name}`}
                    subtitle="Enter / edit marks"
                    onPress={() =>
                      router.push({
                        pathname: '/teacher/exams/marks',
                        params: {
                          examId,
                          classId: s.classId,
                          sectionId: sec.id,
                          subjectId: s.subjectId,
                          title: `${s.subjectName} · ${s.className}-${sec.name}`,
                        },
                      })
                    }
                  />
                ))}
                {!s.sections?.length ? <Text style={{ color: theme.textMuted, paddingVertical: spacing.lg }}>No section assigned.</Text> : null}
              </Card>
            </View>
          ))
        }
      </AsyncView>
    </RefreshableScroll>
  );
}
