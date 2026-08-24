import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useAppStore } from '../../../shared/store/useAppStore';
import { ATTENDANCE_STATUSES } from '../utils/constants';
import { BarChartWidget } from '../components/ui/Chart';
import {
  CalendarCheck, Download, RotateCcw, CheckSquare, XSquare, Send, CheckCircle2, Clock
} from 'lucide-react';

const TABS = [
  { id: 'mark', label: 'Mark Today' },
  { id: 'history', label: 'History Register' },
  { id: 'analytics', label: 'Attendance Analytics' },
];

export const TeacherAttendance = () => {
  const toast = useToast();
  const { store, markStudentAttendance } = useAppStore();

  const [tab, setTab] = useState('mark');
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitted, setSubmitted] = useState(false);

  // Filter students by class
  const classStudents = store.students.filter(s => 
    s.class === 'Class 10' || s.class === '10' || s.class?.includes('10')
  );

  // Load initial attendance for this date from store or default to Present
  const [attendance, setAttendance] = useState(() => {
    const savedDay = store.attendance?.students?.[attendanceDate] || {};
    const initial = {};
    classStudents.forEach(s => {
      initial[s.id] = savedDay[s.id] || 'Present';
    });
    return initial;
  });

  const setStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const updated = {};
    classStudents.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    markStudentAttendance(attendanceDate, selectedClass, attendance, 'Mr. Rajesh Kumar (Teacher)');
    setSubmitted(true);
    toast.success(`Daily attendance submitted for Class ${selectedClass} (${classStudents.length} students)! All student and parent dashboards updated.`);
  };

  const counts = {
    Present: classStudents.filter(s => (attendance[s.id] || 'Present') === 'Present').length,
    Late: classStudents.filter(s => attendance[s.id] === 'Late').length,
    Absent: classStudents.filter(s => attendance[s.id] === 'Absent').length,
    HalfDay: classStudents.filter(s => attendance[s.id] === 'Half Day').length,
    Leave: classStudents.filter(s => attendance[s.id] === 'Leave').length,
  };

  const attendancePercent = classStudents.length > 0
    ? Math.round(((counts.Present + counts.Late * 0.8 + counts.HalfDay * 0.5 + counts.Leave) / classStudents.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-foreground">Class Attendance Register</h2>
          <p className="text-xs text-slate-500 mt-0.5">Record daily roll-call for assigned classes</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => {
              setAttendanceDate(e.target.value);
              setSubmitted(false);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-white dark:bg-slate-900 text-foreground"
          />
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Save & Publish</span>
          </button>
        </div>
      </div>

      <FilterBar
        filters={TABS.map(t => ({ value: t.id, label: t.label }))}
        active={tab}
        onChange={setTab}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4 border-emerald-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Present</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{counts.Present}</div>
        </Card>
        <Card className="p-3 border-l-4 border-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Late</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{counts.Late}</div>
        </Card>
        <Card className="p-3 border-l-4 border-rose-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Absent</span>
          <div className="text-xl font-black text-rose-600 mt-0.5">{counts.Absent}</div>
        </Card>
        <Card className="p-3 border-l-4 border-blue-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">On Leave</span>
          <div className="text-xl font-black text-blue-600 mt-0.5">{counts.Leave}</div>
        </Card>
        <Card className="p-3 border-l-4 border-indigo-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Turnout</span>
          <div className="text-xl font-black text-indigo-600 mt-0.5">{attendancePercent}%</div>
        </Card>
      </div>

      {tab === 'mark' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Bulk Roll Call Actions ({classStudents.length} Students)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => markAll('Present')}
                className="px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                Mark All Present
              </button>
              <button
                onClick={() => markAll('Absent')}
                className="px-3 py-1 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          <Card className="divide-y divide-border overflow-hidden">
            {classStudents.map((st, idx) => {
              const currentStatus = attendance[st.id] || 'Present';
              return (
                <div key={st.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{st.name}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">{st.admissionNo} • Roll #{st.rollNo || (100 + idx)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['Present', 'Late', 'Absent', 'Half Day', 'Leave'].map(stVal => (
                      <button
                        key={stVal}
                        onClick={() => setStatus(st.id, stVal)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          currentStatus === stVal
                            ? stVal === 'Present' ? 'bg-emerald-600 text-white shadow-sm' :
                              stVal === 'Absent' ? 'bg-rose-600 text-white shadow-sm' :
                              stVal === 'Late' ? 'bg-amber-600 text-white shadow-sm' :
                              'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {stVal}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class 10-A Monthly Attendance Sheet</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b">
                <tr>
                  <th className="p-2">Student Name</th>
                  <th className="p-2">Admission No</th>
                  <th className="p-2">Monthly Status</th>
                  <th className="p-2">Overall %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {classStudents.map(st => (
                  <tr key={st.id}>
                    <td className="p-2 font-bold">{st.name}</td>
                    <td className="p-2">{st.admissionNo}</td>
                    <td className="p-2"><Badge variant="success">95% Present</Badge></td>
                    <td className="p-2 font-bold text-emerald-600">95.4%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Weekly Turnout Trend</h3>
            <BarChartWidget
              data={[
                { name: 'Mon', count: 35 },
                { name: 'Tue', count: 34 },
                { name: 'Wed', count: 36 },
                { name: 'Thu', count: 35 },
                { name: 'Fri', count: 33 },
              ]}
              dataKey="count"
              color="#4f46e5"
            />
          </Card>
          <Card className="p-4 flex flex-col justify-center items-center text-center space-y-2">
            <CalendarCheck className="w-10 h-10 text-indigo-600" />
            <h4 className="text-sm font-bold">Class Average Attendance: 96.2%</h4>
            <p className="text-xs text-slate-400 max-w-xs">Class 10-A is leading institutional attendance for Term 1 with minimal unexcused absences.</p>
          </Card>
        </div>
      )}
    </div>
  );
};
export default TeacherAttendance;
