import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useAppStore } from '../../../shared/store/useAppStore';
import { BarChartWidget } from '../components/ui/Chart';
import { FileText, Clock, MapPin, Upload, Save, Send, AlertCircle, CheckCircle, Award } from 'lucide-react';

const examTypeVariant = { 'Unit Test': 'primary', 'Mid Term': 'warning', 'Final': 'danger' };

export const TeacherExamination = () => {
  const toast = useToast();
  const { store, submitMarks } = useAppStore();

  const [tab, setTab] = useState('schedule');
  const [selectedExamId, setSelectedExamId] = useState('EXAM-2026-UT1');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [isDraft, setIsDraft] = useState(true);

  const exams = store.exams || [];
  const classStudents = store.students.filter(s => s.class?.includes('10') || s.class === 'Class 10');

  // Load existing marks from store or default
  const existingExamResults = store.results[selectedExamId] || {};
  const [marksData, setMarksData] = useState(() => {
    const initial = {};
    classStudents.forEach(s => {
      const subRecord = existingExamResults[s.id]?.subjects?.find(sub => sub.subject === selectedSubject);
      initial[s.id] = subRecord ? subRecord.marksObtained : (s.id === 'STU108902' ? 48 : 42);
    });
    return initial;
  });

  const handleMarkChange = (studentId, value) => {
    setMarksData(prev => ({ ...prev, [studentId]: Number(value) }));
  };

  const handleSaveDraft = () => {
    toast.success('Marks saved as local draft!');
    setIsDraft(false);
  };

  const handleSubmitFinal = () => {
    // Build structured entries for store
    const entries = {};
    classStudents.forEach(st => {
      const score = marksData[st.id] !== undefined ? Number(marksData[st.id]) : 40;
      entries[st.id] = [
        {
          subject: selectedSubject,
          maxMarks: 50,
          marksObtained: score
        }
      ];
    });

    submitMarks(selectedExamId, entries, 'Mr. Rajesh Kumar (Teacher)');
    toast.success(`Evaluations submitted for ${selectedSubject} (${classStudents.length} students)! Results synced to School Admin & Student report cards.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Examination & Grading Desk</h2>
        <p className="text-xs text-slate-500 mt-0.5">View institutional exam schedules and submit student subject evaluations</p>
      </div>

      <FilterBar
        filters={[
          { value: 'schedule', label: 'Exam Schedules' },
          { value: 'marks', label: 'Enter & Verify Marks' },
          { value: 'results', label: 'Class Score Overview' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {exams.map(exam => (
            <Card key={exam.id} className="p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{exam.name}</h3>
                    <Badge variant={exam.status === 'Published' ? 'success' : 'warning'}>
                      {exam.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Session: {exam.session || '2026-2027'} • Standard Numerical Evaluation</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedExamId(exam.id);
                    setTab('marks');
                  }}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Grade Class 10-A
                </button>
              </div>

              {exam.schedule && exam.schedule.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {exam.schedule.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>{item.subject}</span>
                        <span className="text-indigo-600">Max: {item.maxMarks}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>{item.date} • {item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Marks Entry Tab */}
      {tab === 'marks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Selected Exam</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-1 text-xs font-bold rounded-xl border border-border bg-white dark:bg-slate-800 text-foreground"
                >
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Subject Area</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-1 text-xs font-bold rounded-xl border border-border bg-white dark:bg-slate-800 text-foreground"
                >
                  {['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science'].map(sub => (
                    <option key={sub} value={sub}>{sub} (Max: 50)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={handleSubmitFinal}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Final Evaluations</span>
              </button>
            </div>
          </div>

          <Card className="divide-y divide-border overflow-hidden">
            {classStudents.map((st, idx) => {
              const currentVal = marksData[st.id] !== undefined ? marksData[st.id] : 45;
              const percent = Math.round((currentVal / 50) * 100);
              const grade = percent >= 90 ? 'A1' : (percent >= 80 ? 'A2' : (percent >= 70 ? 'B1' : (percent >= 60 ? 'B2' : 'C1')));

              return (
                <div key={st.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{st.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">{st.admissionNo} • Class 10-A</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-400">Score / 50:</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={currentVal}
                        onChange={(e) => handleMarkChange(st.id, e.target.value)}
                        className="w-20 px-3 py-1 text-xs font-bold rounded-xl border border-border bg-white dark:bg-slate-800 text-center text-foreground"
                      />
                    </div>
                    <Badge variant={percent >= 80 ? 'success' : 'info'}>
                      {grade} ({percent}%)
                    </Badge>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* Results Summary Tab */}
      {tab === 'results' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-col justify-center items-center text-center space-y-1">
              <Award className="w-8 h-8 text-amber-500" />
              <h3 className="text-sm font-black text-foreground">Class Average: 44.6 / 50</h3>
              <p className="text-[11px] text-slate-400">89.2% overall performance in Mathematics</p>
            </Card>
            <Card className="p-4 flex flex-col justify-center items-center text-center space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <h3 className="text-sm font-black text-foreground">100% Pass Percentage</h3>
              <p className="text-[11px] text-slate-400">All 36 students achieved qualifying score</p>
            </Card>
            <Card className="p-4 flex flex-col justify-center items-center text-center space-y-1">
              <FileText className="w-8 h-8 text-indigo-500" />
              <h3 className="text-sm font-black text-foreground">Top Rank: Aarav Sharma</h3>
              <p className="text-[11px] text-slate-400">Scored 48/50 (96%) in Unit Test 1</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
export default TeacherExamination;
