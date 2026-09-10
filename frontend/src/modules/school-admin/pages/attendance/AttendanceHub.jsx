import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { AttendanceManagement } from './AttendanceManagement';
import { StudentAttendancePanel } from './StudentAttendancePanel';

export const AttendanceHub = () => {
  const [tab, setTab] = useState('staff');

  return (
    <div className="space-y-6">
      {tab === 'students' && (
        <PageHeader
          title="Student Attendance"
          subtitle="Mark daily roll-call per section. Feeds the Principal's Attendance Monitoring."
        />
      )}
      <Tabs
        tabs={[
          { id: 'staff', label: 'Staff Attendance' },
          { id: 'students', label: 'Student Attendance' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === 'staff' ? <AttendanceManagement /> : <StudentAttendancePanel />}
    </div>
  );
};

export default AttendanceHub;
