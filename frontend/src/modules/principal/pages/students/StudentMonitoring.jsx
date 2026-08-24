import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { PieChart } from '../../components/ui/Charts/PieChart';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { 
  MOCK_STUDENTS 
} from '../../utils/constants';
import { 
  User, 
  BookOpen, 
  Calendar, 
  FileText, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  UserCheck,
  UserX,
  ShieldAlert
} from 'lucide-react';

export const StudentMonitoring = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalTab, setModalTab] = useState('profile');

  // Directory Columns
  const columns = [
    { key: 'admissionNo', title: 'Admn No', sortable: true },
    { 
      key: 'name', 
      title: 'Student Name', 
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
            {val.charAt(0)}
          </div>
          <span className="font-bold">{val}</span>
        </div>
      )
    },
    { key: 'class', title: 'Class' },
    { key: 'section', title: 'Sec' },
    { key: 'gender', title: 'Gender' },
    { 
      key: 'gpa', 
      title: 'GPA / Marks', 
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-1">
          <span className="font-bold">{val}</span>
          <span className="text-[10px] text-slate-400">GPA</span>
        </div>
      )
    },
    { 
      key: 'attendanceRate', 
      title: 'Attendance', 
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${val >= 90 ? 'bg-emerald-500' : val >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} 
              style={{ width: `${val}%` }}
            ></div>
          </div>
          <span className={`font-bold ${val < 75 ? 'text-rose-600' : ''}`}>{val}%</span>
        </div>
      )
    },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => (
        <Badge variant={val === 'Active' ? 'success' : 'danger'}>
          {val}
        </Badge>
      )
    }
  ];

  // Filters mapping
  const filterOptions = [
    {
      key: 'class',
      label: 'Class',
      options: [
        { value: '8', label: 'Class 8' },
        { value: '9', label: 'Class 9' },
        { value: '10', label: 'Class 10' },
        { value: '11', label: 'Class 11' },
        { value: '12', label: 'Class 12' }
      ]
    },
    {
      key: 'gender',
      label: 'Gender',
      options: [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' }
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

  // Analytics datasets
  const topPerformers = MOCK_STUDENTS.filter(s => s.gpa >= 9.0);
  const lowPerformers = MOCK_STUDENTS.filter(s => s.gpa < 6.0);
  const irregularAttendance = MOCK_STUDENTS.filter(s => s.attendanceRate < 80);
  const pendingFees = MOCK_STUDENTS.filter(s => s.pendingFees > 0);

  // Student specific mock marks (dynamic render)
  const getStudentMockMarks = (studentName) => {
    return [
      { subject: 'Math', marks: 88 },
      { subject: 'Physics', marks: 91 },
      { subject: 'English', marks: 84 },
      { subject: 'History', marks: 76 },
      { subject: 'CS', marks: 95 }
    ];
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Student Monitoring & Analytics" 
        subtitle="Observe school-wide student lists, individual performance profiles, GPAs, and attendance flags." 
      />

      <Tabs 
        tabs={[
          { id: 'directory', label: 'Student Directory' },
          { id: 'analytics', label: 'Academic & Fee Risk Analytics' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'directory' && (
        <DataTable 
          columns={columns} 
          data={MOCK_STUDENTS} 
          searchPlaceholder="Search students by name..."
          searchKey="name"
          filterOptions={filterOptions}
          onRowClick={(row) => {
            setSelectedStudent(row);
            setModalTab('profile');
          }}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Top Performers (GPA ≥ 9.0)</span>
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850/50">
              {topPerformers.map(s => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-slate-900 dark:text-white block">{s.name}</span>
                    <span className="text-[10px] text-slate-400">Class {s.class}-{s.section}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 block">{s.gpa} GPA</span>
                    <span className="text-[10px] text-slate-400">Outstanding</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Performers Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <span>Underperforming Students (GPA &lt; 6.0)</span>
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850/50">
              {lowPerformers.map(s => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-slate-900 dark:text-white block">{s.name}</span>
                    <span className="text-[10px] text-slate-400">Class {s.class}-{s.section}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600 block">{s.gpa} GPA</span>
                    <span className="text-[10px] text-slate-400">Needs Support</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Irregular Attendance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-500" />
              <span>Chronic Absenteeism (Attendance &lt; 80%)</span>
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850/50">
              {irregularAttendance.map(s => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-slate-900 dark:text-white block">{s.name}</span>
                    <span className="text-[10px] text-slate-400">Class {s.class}-{s.section}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600 block">{s.attendanceRate}% Attendance</span>
                    <span className="text-[10px] text-slate-400">{100 - s.attendanceRate}% Absences</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Fees */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Outstanding Deficit Tuitions</span>
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850/50">
              {pendingFees.map(s => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-slate-900 dark:text-white block">{s.name}</span>
                    <span className="text-[10px] text-slate-400">Class {s.class}-{s.section}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">₹{s.pendingFees}</span>
                    <span className="text-[10px] text-slate-400">Invoice Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedStudent(null)} 
          title={`Student File: ${selectedStudent.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Header card info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="w-14 h-14 bg-emerald-600 rounded-xl text-white flex items-center justify-center font-black text-lg">
                {selectedStudent.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h3>
                  <Badge variant={selectedStudent.status === 'Active' ? 'success' : 'danger'}>
                    {selectedStudent.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-1">
                  Admission No: {selectedStudent.admissionNo} • Class: {selectedStudent.class}-{selectedStudent.section}
                </p>
              </div>
            </div>

            {/* Modal Subtabs */}
            <Tabs 
              tabs={[
                { id: 'profile', label: 'Basic Info & Medical' },
                { id: 'charts', label: 'Attendance & Academics' },
                { id: 'history', label: 'Promotion & Transfers' }
              ]} 
              activeTab={modalTab} 
              onChange={setModalTab} 
            />

            {modalTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3.5 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Demographic Profile</span>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date of Birth</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.dob}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gender Identity</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parent / Guardian</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact Phone</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStudent.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Operational Health Notes</span>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-600 block">Medical Conditions Info</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">{selectedStudent.medicalInfo}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 block">Behavior & Discipline Audit</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">Current behavior review rating is {selectedStudent.behaviorScore}. No active complaints logs registered.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalTab === 'charts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance pie chart */}
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider mb-2 self-start">Attendance Ratio</span>
                  <PieChart 
                    data={[
                      { name: 'Present Ratio', value: selectedStudent.attendanceRate },
                      { name: 'Absent Ratio', value: 100 - selectedStudent.attendanceRate }
                    ]} 
                    height={180} 
                    colors={["#059669", "#fda4af"]} 
                  />
                  <div className="text-center mt-2 text-xs font-bold">
                    <span>Rate: {selectedStudent.attendanceRate}%</span>
                  </div>
                </div>

                {/* Academic results chart */}
                <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block mb-4">Subject-wise Marks (%)</span>
                  <BarChart 
                    data={getStudentMockMarks(selectedStudent.name)} 
                    dataKey="marks" 
                    xKey="subject" 
                    height={180} 
                    color="#10b981" 
                  />
                </div>
              </div>
            )}

            {modalTab === 'history' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Promotion logs */}
                <div className="space-y-3 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-1.5">Promotion Logs</span>
                  <div className="space-y-3">
                    {selectedStudent.promotionHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-semibold">
                        <div>
                          <span className="text-slate-800 dark:text-white">Class {item.fromClass} → Class {item.toClass}</span>
                          <span className="text-[9px] text-slate-400 block">{item.date}</span>
                        </div>
                        <Badge variant="success">{item.status}</Badge>
                      </div>
                    ))}
                    {selectedStudent.promotionHistory.length === 0 && (
                      <p className="text-slate-400 py-4 text-center">No promotions logged.</p>
                    )}
                  </div>
                </div>

                {/* Transfer logs */}
                <div className="space-y-3 bg-white dark:bg-slate-900 border rounded-2xl p-4">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-1.5">Transfer history</span>
                  <div className="space-y-3">
                    {selectedStudent.transferHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1.5 font-semibold">
                        <div className="flex justify-between">
                          <span className="text-slate-800 dark:text-white">{item.fromSchool}</span>
                          <span className="text-[9px] text-slate-400">{item.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-450 mt-1 font-medium">Reason: {item.reason}</p>
                      </div>
                    ))}
                    {selectedStudent.transferHistory.length === 0 && (
                      <p className="text-slate-400 py-4 text-center">No transfers logged.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
export default StudentMonitoring;
