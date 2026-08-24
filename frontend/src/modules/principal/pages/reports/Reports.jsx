import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { exportToCSV } from '../../utils/exportHelpers';
import { 
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_LEAVE_REQUESTS,
  MOCK_EXAMS
} from '../../utils/constants';
import { FileSpreadsheet, Download } from 'lucide-react';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('students');
  const { showToast, ToastComponent } = useToast();

  const handleCustomExport = (dataset, name) => {
    exportToCSV(dataset, `${name}_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`${name} report exported to CSV successfully!`, 'success');
  };

  // Student report grid columns
  const studentColumns = [
    { key: 'admissionNo', title: 'Admn No' },
    { key: 'name', title: 'Student Name', sortable: true },
    { key: 'class', title: 'Class' },
    { key: 'section', title: 'Sec' },
    { key: 'gpa', title: 'GPA Score' },
    { key: 'attendanceRate', title: 'Attendance Rate (%)' }
  ];

  // Leave audit reports columns
  const leaveColumns = [
    { key: 'staffName', title: 'Staff Name' },
    { key: 'role', title: 'Role' },
    { key: 'dates', title: 'Requested Dates' },
    { key: 'days', title: 'Duration (Days)' },
    { key: 'status', title: 'Approval Status' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports Hub" 
        subtitle="Generate, review and export school operations audit files, attendance stats, and GPAs." 
      />

      <Tabs 
        tabs={[
          { id: 'students', label: 'Student Roster Reports' },
          { id: 'leaves', label: 'Leaves Audit Reports' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => handleCustomExport(MOCK_STUDENTS, 'student_roster')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Roster CSV</span>
            </button>
          </div>
          <DataTable 
            columns={studentColumns} 
            data={MOCK_STUDENTS} 
            searchPlaceholder="Search student reports..."
            searchKey="name"
          />
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => handleCustomExport(MOCK_LEAVE_REQUESTS, 'leave_audit')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Leaves CSV</span>
            </button>
          </div>
          <DataTable 
            columns={leaveColumns} 
            data={MOCK_LEAVE_REQUESTS} 
            searchPlaceholder="Search leaves..."
            searchKey="staffName"
          />
        </div>
      )}

      <ToastComponent />
    </div>
  );
};
export default Reports;
