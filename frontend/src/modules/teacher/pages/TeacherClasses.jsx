import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SearchBar } from '../components/ui/SearchBar';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { mockClasses, mockStudents } from '../data/mockData';
import { Users, Phone, Calendar, BarChart2, BookOpen, ChevronRight, User } from 'lucide-react';

export const TeacherClasses = () => {
  const [selectedClass, setSelectedClass] = useState(mockClasses[0]?.id || '');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const currentClass = mockClasses.find(c => c.id === selectedClass);
  const students = (mockStudents[selectedClass] || []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo.includes(search)
  );

  const classFilters = mockClasses.map(c => ({
    value: c.id,
    label: `${c.name} - ${c.section}`,
  }));

  const getAttendanceBadge = (pct) => {
    if (pct >= 90) return 'success';
    if (pct >= 75) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-foreground">My Classes</h2>
        <p className="text-xs text-slate-500 mt-0.5">View and manage your assigned classes and students</p>
      </div>

      {/* Class Selector */}
      <FilterBar
        filters={classFilters}
        active={selectedClass}
        onChange={setSelectedClass}
      />

      {/* Class Info Card */}
      {currentClass && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit mx-auto mb-2">
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-xl font-black text-foreground">{currentClass.strength}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total Students</p>
          </Card>
          <Card className="text-center">
            <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mx-auto mb-2">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-foreground">
              {students.filter(s => s.attendance >= 75).length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Regular (&gt;75%)</p>
          </Card>
          <Card className="text-center">
            <div className="p-3 bg-rose-500/10 rounded-2xl w-fit mx-auto mb-2">
              <Users className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-xl font-black text-foreground">
              {students.filter(s => s.attendance < 75).length}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Irregular (&lt;75%)</p>
          </Card>
          <Card className="text-center">
            <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mx-auto mb-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xl font-black text-foreground">{currentClass.subjects.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Subjects</p>
          </Card>
        </div>
      )}

      {/* Subjects Row */}
      {currentClass && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {currentClass.subjects.map(s => (
              <Badge key={s} variant="info">{s}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Student List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Student List ({students.length})
          </h3>
        </div>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or roll number..."
          className="mb-4"
        />

        {students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Try a different search term"
            icon={Users}
          />
        ) : (
          <div className="space-y-2">
            {students.map(student => (
              <div
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-border hover:border-primary/20 hover:shadow-premium transition-all duration-150 cursor-pointer active:scale-[0.99] select-none"
              >
                <Avatar src={student.photo} name={student.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400">#{student.rollNo}</span>
                    <h4 className="text-xs font-bold text-foreground truncate">{student.name}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">{student.gender}</span>
                    <span className="text-[10px] text-slate-400">Avg: {student.avgMarks}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant={getAttendanceBadge(student.attendance)}>
                    {student.attendance}%
                  </Badge>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Student Detail Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Profile"
        size="md"
      >
        {selectedStudent && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={selectedStudent.photo} name={selectedStudent.name} size="xl" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400">Roll #{selectedStudent.rollNo}</span>
                </div>
                <h3 className="text-base font-black text-foreground">{selectedStudent.name}</h3>
                <p className="text-xs text-slate-500">{selectedStudent.gender}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-center">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{selectedStudent.attendance}%</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Attendance</p>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-center">
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedStudent.avgMarks}%</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Avg. Marks</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center gap-3 text-xs">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-semibold text-foreground">{selectedStudent.dob}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Contact:</span>
                <span className="font-semibold text-foreground">{selectedStudent.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Parent:</span>
                <span className="font-semibold text-foreground">{selectedStudent.parent} ({selectedStudent.parentPhone})</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedStudent(null)}
                className="flex-1 py-2.5 rounded-2xl border border-border text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
