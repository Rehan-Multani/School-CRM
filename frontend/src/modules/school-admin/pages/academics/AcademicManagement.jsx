import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { 
  Plus, 
  Book, 
  Calendar, 
  Bookmark, 
  ArrowRight,
  ClipboardList,
  Edit3,
  Clock,
  CheckCircle2
} from 'lucide-react';

export const AcademicManagement = () => {
  const [activeTab, setActiveTab] = useState('classes');
  const { showToast, ToastComponent } = useToast();
  const { store, updateStore } = useAppStore();

  const classes = store.classes || [];
  const subjects = store.subjects || [];
  const timetable10A = store.timetable?.['10-A'] || [];

  // Modal control
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [timetableEditorOpen, setTimetableEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [newItem, setNewItem] = useState({
    name: '',
    capacity: 40,
    classTeacher: 'Mr. Rajesh Kumar',
    className: 'Class 10',
    type: 'Theory',
    code: ''
  });

  const [editingPeriod, setEditingPeriod] = useState({
    day: 'Monday',
    period: 1,
    subject: 'Mathematics',
    teacher: 'Mr. Rajesh Kumar',
    room: 'Room 201'
  });

  const handleCreateAcademicEntity = (e) => {
    e.preventDefault();
    const mockId = `ACAD-${Date.now().toString().slice(-4)}`;

    if (activeTab === 'classes') {
      const newClassObj = {
        id: mockId,
        name: newItem.name,
        capacity: newItem.capacity,
        classTeacher: newItem.classTeacher,
        sections: ['A', 'B'],
        strength: 36
      };
      updateStore(prev => ({
        ...prev,
        classes: [...prev.classes, newClassObj]
      }), 'CLASS_CREATED');
      showToast(`Class "${newItem.name}" created with assigned teacher ${newItem.classTeacher}!`, 'success');
    } else if (activeTab === 'subjects') {
      const newSubObj = {
        id: mockId,
        class: newItem.className,
        name: newItem.name,
        code: newItem.code || `SUB-${newItem.name.slice(0,3).toUpperCase()}`,
        teacher: newItem.classTeacher,
        type: newItem.type
      };
      updateStore(prev => ({
        ...prev,
        subjects: [...prev.subjects, newSubObj]
      }), 'SUBJECT_CREATED');
      showToast(`Subject "${newItem.name}" created successfully!`, 'success');
    }
    setCreateModalOpen(false);
  };

  const handleSaveTimetableSlot = (e) => {
    e.preventDefault();
    updateStore(prev => {
      const current10A = prev.timetable?.['10-A'] || [];
      const updatedDays = current10A.map(d => {
        if (d.day === editingPeriod.day) {
          const updatedPeriods = d.periods.map(p => {
            if (p.period === Number(editingPeriod.period)) {
              return {
                ...p,
                subject: editingPeriod.subject,
                teacher: editingPeriod.teacher,
                room: editingPeriod.room
              };
            }
            return p;
          });
          return { ...d, periods: updatedPeriods };
        }
        return d;
      });

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          '10-A': updatedDays
        }
      };
    }, 'TIMETABLE_UPDATED');

    setTimetableEditorOpen(false);
    showToast(`Timetable updated for ${editingPeriod.day}, Period ${editingPeriod.period}! All student and teacher portals synchronized.`, 'success');
  };

  // Flatten timetable for tabular review
  const flatTimetable = [];
  timetable10A.forEach(d => {
    d.periods.forEach(p => {
      flatTimetable.push({
        id: `${d.day}-${p.period}`,
        class: 'Class 10-A',
        day: d.day,
        period: `Period ${p.period}`,
        time: p.time,
        subject: p.subject,
        teacher: p.teacher,
        room: p.room
      });
    });
  });

  const classColumns = [
    { header: 'Class Name', key: 'name' },
    { header: 'Max Capacity', key: 'capacity', render: (val) => `${val || 40} Students` },
    { header: 'Sections', key: 'sections', render: (val) => Array.isArray(val) ? val.join(', ') : (val || 'A, B') },
    { header: 'Enrolled Strength', key: 'strength', render: (val) => val || 36 },
    { header: 'Class Teacher', key: 'classTeacher', render: (val) => <span className="font-bold text-indigo-650 dark:text-indigo-400">{val || 'Mr. Rajesh Kumar'}</span> },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <button
          onClick={() => {
            setSelectedItem(row);
            setAllocationModalOpen(true);
          }}
          className="text-xs font-bold text-indigo-650 hover:underline"
        >
          Assign Teacher
        </button>
      )
    }
  ];

  const subjectColumns = [
    { header: 'Class', key: 'class', render: (val) => val || 'Class 10' },
    { header: 'Subject Code', key: 'code', render: (val) => <Badge variant="default">{val || 'MTH101'}</Badge> },
    { header: 'Subject Name', key: 'name' },
    { header: 'Assigned Instructor', key: 'teacher', render: (val, row) => val || row.subjectTeacher || 'Mr. Rajesh Kumar' },
    { header: 'Type', key: 'type', render: (val) => <Badge variant={val === 'Practical' ? 'warning' : 'success'}>{val || 'Theory'}</Badge> }
  ];

  const timetableColumns = [
    { header: 'Target Class', key: 'class' },
    { header: 'Day', key: 'day', render: (val) => <Badge variant="primary">{val}</Badge> },
    { header: 'Period', key: 'period' },
    { header: 'Timing Duration', key: 'time' },
    { header: 'Subject', key: 'subject' },
    { header: 'Assigned Teacher', key: 'teacher' },
    { header: 'Room / Lab', key: 'room' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Academic & Timetable Management" 
        subtitle="Configure classes, assign sections, map subjects to teachers, and design the weekly schedule grid."
        actions={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Academic Entity</span>
          </button>
        }
      />

      <Tabs 
        tabs={[
          { id: 'classes', label: 'Classes & Sections', count: classes.length },
          { id: 'subjects', label: 'Subjects Catalog', count: subjects.length },
          { id: 'timetable', label: 'Weekly Timetable Matrix', count: flatTimetable.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        {activeTab === 'classes' && <DataTable columns={classColumns} data={classes} />}
        {activeTab === 'subjects' && <DataTable columns={subjectColumns} data={subjects} />}
        {activeTab === 'timetable' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/50 p-4 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Class 10-A Master Schedule</h4>
                  <p className="text-[11px] text-slate-500">Live schedule changes propagate directly to Teacher, Student, and Parent timetable portals.</p>
                </div>
              </div>
              <button
                onClick={() => setTimetableEditorOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Slot Schedule</span>
              </button>
            </div>
            <DataTable columns={timetableColumns} data={flatTimetable} searchPlaceholder="Search schedule..." />
          </div>
        )}
      </div>

      {/* CREATE ACADEMIC ENTITY MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title={`Create ${activeTab.toUpperCase()}`}>
        <form onSubmit={handleCreateAcademicEntity} className="space-y-4">
          {activeTab === 'classes' ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class Label Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Class 11" 
                  value={newItem.name} 
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})} 
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class Capacity</label>
                  <input 
                    type="number" 
                    value={newItem.capacity} 
                    onChange={(e) => setNewItem({...newItem, capacity: Number(e.target.value)})} 
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class Teacher</label>
                  <select
                    value={newItem.classTeacher}
                    onChange={(e) => setNewItem({...newItem, classTeacher: e.target.value})}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  >
                    {store.staff.filter(s => s.role === 'Teacher').map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.department})</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Class</label>
                  <select
                    value={newItem.className}
                    onChange={(e) => setNewItem({...newItem, className: e.target.value})}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  >
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Type</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Environmental Science" 
                    value={newItem.name} 
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})} 
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. EVS101" 
                    value={newItem.code} 
                    onChange={(e) => setNewItem({...newItem, code: e.target.value})} 
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Create</button>
          </div>
        </form>
      </Modal>

      {/* TIMETABLE SLOT EDITOR MODAL */}
      <Modal isOpen={timetableEditorOpen} onClose={() => setTimetableEditorOpen(false)} title="Adjust Timetable Schedule Slot">
        <form onSubmit={handleSaveTimetableSlot} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Day of Week</label>
              <select
                value={editingPeriod.day}
                onChange={(e) => setEditingPeriod({ ...editingPeriod, day: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Period Slot</label>
              <select
                value={editingPeriod.period}
                onChange={(e) => setEditingPeriod({ ...editingPeriod, period: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
            <select
              value={editingPeriod.subject}
              onChange={(e) => setEditingPeriod({ ...editingPeriod, subject: e.target.value })}
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
            >
              {['Mathematics', 'Science (Physics)', 'Science (Chemistry)', 'Science (Biology)', 'English', 'Social Studies', 'Computer Science', 'Physical Education', 'Library'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teacher Assigned</label>
              <select
                value={editingPeriod.teacher}
                onChange={(e) => setEditingPeriod({ ...editingPeriod, teacher: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                {store.staff.filter(s => s.role === 'Teacher').map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Room / Lab</label>
              <input
                type="text"
                value={editingPeriod.room}
                onChange={(e) => setEditingPeriod({ ...editingPeriod, room: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Save Slot & Broadcast Update
          </button>
        </form>
      </Modal>

      {/* ALLOCATION MODAL */}
      <Modal isOpen={allocationModalOpen} onClose={() => setAllocationModalOpen(false)} title={`Assign Class Teacher for: ${selectedItem?.name}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400">Select Instructor</label>
            <select className="w-full bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-border">
              {store.staff.filter(s => s.role === 'Teacher').map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.department})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button onClick={() => setAllocationModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">Cancel</button>
            <button onClick={() => {
              showToast('Class teacher allocated successfully!', 'success');
              setAllocationModalOpen(false);
            }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Save Changes</button>
          </div>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
};
export default AcademicManagement;
