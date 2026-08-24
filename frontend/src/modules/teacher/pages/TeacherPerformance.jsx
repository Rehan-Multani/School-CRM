import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchBar } from '../components/ui/SearchBar';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { mockClasses, mockStudents } from '../data/mockData';
import { BarChartWidget, LineChartWidget, PieChartWidget } from '../components/ui/Chart';
import { TrendingUp, TrendingDown, BarChart2, Download } from 'lucide-react';

const attendanceData = [
  { month: 'Apr', percent: 85 }, { month: 'May', percent: 88 },
  { month: 'Jun', percent: 92 }, { month: 'Jul', percent: 87 },
];

const marksData = [
  { exam: 'UT1', marks: 22 }, { exam: 'UT2', marks: 18 },
  { exam: 'Mid', marks: 68 }, { exam: 'UT3', marks: 24 },
];

export const TeacherPerformance = () => {
  const [selectedClass, setSelectedClass] = useState(mockClasses[0]?.id || '');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sortBy, setSortBy] = useState('attendance');

  const students = (mockStudents[selectedClass] || [])
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'attendance') return b.attendance - a.attendance;
      if (sortBy === 'marks') return b.avgMarks - a.avgMarks;
      return a.name.localeCompare(b.name);
    });

  const classFilters = mockClasses.map(c => ({ value: c.id, label: `${c.name}-${c.section}` }));

  const getRowStyle = (index, total) => {
    if (index < 3) return 'border-l-4 border-l-emerald-400 bg-emerald-500/5';
    if (index >= total - 2) return 'border-l-4 border-l-rose-400 bg-rose-500/5';
    return '';
  };

  const pieData = [
    { name: '90-100%', value: students.filter(s => s.attendance >= 90).length },
    { name: '75-89%', value: students.filter(s => s.attendance >= 75 && s.attendance < 90).length },
    { name: '<75%', value: students.filter(s => s.attendance < 75).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Student Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Analyze and track student progress</p>
        </div>
        <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      <FilterBar filters={classFilters} active={selectedClass} onChange={setSelectedClass} />

      {/* Class Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-xl font-black text-primary">{Math.round(students.reduce((s, st) => s + st.attendance, 0) / (students.length || 1))}%</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Avg Attendance</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-black text-amber-500">{Math.round(students.reduce((s, st) => s + st.avgMarks, 0) / (students.length || 1))}%</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Avg Marks</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-black text-emerald-500">{students.filter(s => s.attendance >= 90).length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Top Performers</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-black text-rose-500">{students.filter(s => s.attendance < 75).length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Need Attention</p>
        </Card>
      </div>

      {/* Attendance Distribution Pie */}
      <Card>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attendance Distribution</h3>
        <PieChartWidget data={pieData} height={200} />
      </Card>

      {/* Student Table */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search students..." className="flex-1" />
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="performance-sort"
            >
              <option value="attendance">Sort: Attendance</option>
              <option value="marks">Sort: Marks</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {students.map((student, i) => (
            <div
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className={`flex items-center gap-4 p-3.5 rounded-2xl border border-border hover:border-primary/20 hover:shadow-premium transition-all cursor-pointer active:scale-[0.99] select-none ${getRowStyle(i, students.length)}`}
            >
              <span className="text-xs font-black text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}</span>
              <Avatar src={student.photo} name={student.name} size="sm" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">{student.name}</h4>
                <p className="text-[10px] text-slate-400">Roll #{student.rollNo}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {student.attendance >= 90
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : student.attendance < 75
                        ? <TrendingDown className="w-3 h-3 text-rose-500" />
                        : <BarChart2 className="w-3 h-3 text-amber-500" />
                    }
                    <span className={`text-xs font-black ${student.attendance >= 90 ? 'text-emerald-500' : student.attendance < 75 ? 'text-rose-500' : 'text-amber-500'}`}>
                      {student.attendance}%
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">Attendance</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-foreground">{student.avgMarks}%</span>
                  <p className="text-[9px] text-slate-400">Avg Marks</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Student Detail Modal */}
      <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Analytics" size="lg">
        {selectedStudent && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={selectedStudent.photo} name={selectedStudent.name} size="lg" />
              <div>
                <h3 className="text-base font-black text-foreground">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-500">Roll #{selectedStudent.rollNo} • {selectedStudent.gender}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl text-center">
                <p className="text-xl font-black text-primary">{selectedStudent.attendance}%</p>
                <p className="text-[10px] text-slate-500 font-medium">Attendance</p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-2xl text-center">
                <p className="text-xl font-black text-amber-600">{selectedStudent.avgMarks}%</p>
                <p className="text-[10px] text-slate-500 font-medium">Avg Marks</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Attendance Trend</h4>
              <BarChartWidget data={attendanceData} xKey="month" bars={[{ key: 'percent', label: 'Attendance %', color: '#4F46E5' }]} height={160} />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Marks Trend</h4>
              <LineChartWidget data={marksData} xKey="exam" lines={[{ key: 'marks', label: 'Marks', color: '#F59E0B' }]} height={160} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
