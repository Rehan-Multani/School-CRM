import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { 
  MOCK_TEACHERS,
  MOCK_SYLLABUS
} from '../../utils/constants';
import { 
  BookOpen, 
  Clock, 
  Award, 
  Layers, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

export const TeacherMonitoring = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [modalTab, setModalTab] = useState('profile');

  // Directory columns
  const columns = [
    { 
      key: 'name', 
      title: 'Teacher Name', 
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
            {val.charAt(4) || val.charAt(0)}
          </div>
          <span className="font-bold">{val}</span>
        </div>
      )
    },
    { key: 'department', title: 'Department', sortable: true },
    { key: 'qualification', title: 'Qualification' },
    { key: 'experience', title: 'Experience' },
    { key: 'classes', title: 'Assigned Classes' },
    { 
      key: 'attendanceRate', 
      title: 'Attendance', 
      sortable: true, 
      render: (val) => <span className="font-bold">{val}%</span>
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => <Badge variant={val === 'Active' ? 'success' : 'danger'}>{val}</Badge>
    }
  ];

  // Filters
  const filterOptions = [
    {
      key: 'department',
      label: 'Department',
      options: [
        { value: 'Science', label: 'Science' },
        { value: 'Mathematics', label: 'Mathematics' },
        { value: 'English', label: 'English' },
        { value: 'Social Studies', label: 'Social Studies' },
        { value: 'Computer Science', label: 'Computer Science' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Teacher Monitoring" 
        subtitle="Observe faculty directory details, professional profiles, leaves history, and class lesson plans." 
      />

      <Tabs 
        tabs={[
          { id: 'directory', label: 'Faculty Directory' },
          { id: 'progress', label: 'Syllabus & Lesson Progress' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'directory' && (
        <DataTable 
          columns={columns} 
          data={MOCK_TEACHERS} 
          searchPlaceholder="Search faculty by name..."
          searchKey="name"
          filterOptions={filterOptions}
          onRowClick={(row) => {
            setSelectedTeacher(row);
            setModalTab('profile');
          }}
        />
      )}

      {activeTab === 'progress' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-2xl">
              <BookOpen className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-850 dark:text-white">Curriculum Progression Index</h4>
              <p className="text-xs text-slate-450 mt-1">Review live syllabus completion percentages across classes mapped to corresponding courses.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress Bars */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Course Completion Tracker</span>
              <div className="space-y-4">
                {MOCK_SYLLABUS.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-800 dark:text-white">Class {item.class} • {item.subject}</span>
                      <span className="font-bold text-emerald-600">{item.progress}% Finished</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.progress >= 80 ? 'bg-emerald-500' : item.progress >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className={`text-[10px] block font-bold ${item.status === 'Completed' || item.status === 'On Track' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      Status: {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance charts */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-2">Curriculum Averages Matrix</span>
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  Course tracking shows average completion is at 71.6% across secondary grades, with science subjects leading progress levels.
                </p>
              </div>
              <div className="pt-4">
                <BarChart 
                  data={MOCK_SYLLABUS.map(s => ({ name: s.subject, val: s.progress }))} 
                  dataKey="val" 
                  xKey="name" 
                  height={180} 
                  color="#10b981" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Profile Modal */}
      {selectedTeacher && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedTeacher(null)} 
          title={`Faculty Card: ${selectedTeacher.name}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl text-white flex items-center justify-center font-black text-lg">
                {selectedTeacher.name.charAt(4) || selectedTeacher.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedTeacher.name}</h3>
                  <Badge variant={selectedTeacher.status === 'Active' ? 'success' : 'danger'}>
                    {selectedTeacher.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-1">
                  Dept: {selectedTeacher.department} • Experience: {selectedTeacher.experience} • Workload: {selectedTeacher.workloadHours} hrs/week
                </p>
              </div>
            </div>

            <Tabs 
              tabs={[
                { id: 'profile', label: 'Credentials & Workload' },
                { id: 'leaves', label: 'Leaves & Absence History' }
              ]} 
              activeTab={modalTab} 
              onChange={setModalTab} 
            />

            {modalTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3.5 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Professional Profile</span>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Qualifications</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.qualification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email Address</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile Phone</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Subjects & Lesson completion</span>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Courses Handled</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTeacher.subjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Lesson Completion</span>
                      <span className="font-bold text-emerald-600">{selectedTeacher.lessonProgress}% Finished</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'leaves' && (
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 text-xs font-semibold">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2 mb-3">Absence Records</span>
                <div className="space-y-3">
                  {selectedTeacher.leaveHistory && selectedTeacher.leaveHistory.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <span className="text-slate-800 dark:text-white block font-bold">{item.type}</span>
                        <span className="text-[10px] text-slate-405 block mt-0.5">{item.date} • {item.days} day(s)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">"Reason: {item.reason}"</p>
                    </div>
                  ))}
                  {(!selectedTeacher.leaveHistory || selectedTeacher.leaveHistory.length === 0) && (
                    <p className="text-center py-6 text-slate-400">No leaves logged for this staff.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
export default TeacherMonitoring;
