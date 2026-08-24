import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { 
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_STAFF,
  STUDENT_ATTENDANCE_TREND
} from '../../utils/constants';

export const AttendanceMonitoring = () => {
  const [activeTab, setActiveTab] = useState('students');

  // Student Attendance Grid
  const studentColumns = [
    { key: 'admissionNo', title: 'Admn No' },
    { key: 'name', title: 'Student Name', sortable: true },
    { key: 'class', title: 'Class' },
    { key: 'section', title: 'Sec' },
    { 
      key: 'attendanceRate', 
      title: 'Roll Call Status Today',
      render: (val) => (
        <Badge variant={val >= 90 ? 'success' : val >= 75 ? 'warning' : 'danger'}>
          {val >= 90 ? 'Present' : val >= 75 ? 'Late Arrival' : 'Absent'}
        </Badge>
      )
    },
    { key: 'phone', title: 'Parent Contact' }
  ];

  // Staff Attendance Grid
  const staffColumns = [
    { key: 'name', title: 'Staff Member Name', sortable: true },
    { key: 'department', title: 'Department / Role' },
    { 
      key: 'attendanceRate', 
      title: 'Attendance Status Today',
      render: (val) => (
        <Badge variant={val >= 95 ? 'success' : 'danger'}>
          {val >= 95 ? 'Present (On Time)' : 'On Leave'}
        </Badge>
      )
    }
  ];

  // Combine Teachers and Support Staff for staff overview
  const combinedStaff = [
    ...MOCK_TEACHERS.map(t => ({ id: t.id, name: t.name, department: `${t.department} Dept`, attendanceRate: t.attendanceRate })),
    ...MOCK_STAFF.map(s => ({ id: s.id, name: s.name, department: `${s.role} (${s.department})`, attendanceRate: s.attendanceRate }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance Monitoring" 
        subtitle="Observe daily student roll calls, teacher clock-ins, leaves frequency, and monthly reports." 
      />

      <Tabs 
        tabs={[
          { id: 'students', label: 'Student Daily Roll Call' },
          { id: 'staff', label: 'Academic & Admin Staff Log' },
          { id: 'trends', label: 'Attendance Trends (Recharts)' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'students' && (
        <DataTable 
          columns={studentColumns} 
          data={MOCK_STUDENTS} 
          searchPlaceholder="Search students by name..."
          searchKey="name"
          filterOptions={[
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
            }
          ]}
        />
      )}

      {activeTab === 'staff' && (
        <DataTable 
          columns={staffColumns} 
          data={combinedStaff} 
          searchPlaceholder="Search staff by name..."
          searchKey="name"
        />
      )}

      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Student Attendance Rate (%)</span>
            <AreaChart data={STUDENT_ATTENDANCE_TREND} dataKey="attendance" xKey="month" height={245} color="#059669" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs font-semibold">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2">Absences Analytics Breakdown</span>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400">Total Unexcused Absences Today</span>
                <h4 className="text-xl font-extrabold text-slate-805 mt-1">56 Students</h4>
                <p className="text-[10px] text-slate-400 mt-1">Automatic notifications sent to parents of all absent students.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400">Staff Present Ratio</span>
                <h4 className="text-xl font-extrabold text-emerald-600 mt-1">94.3%</h4>
                <p className="text-[10px] text-slate-400 mt-1">Average staff presence level complies with state requirements.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AttendanceMonitoring;
