import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { TeacherManagement } from '../pages/teachers/TeacherManagement';
import { StaffManagement } from '../pages/staff/StaffManagement';
import { EmployeeList } from '../pages/employees/EmployeeList';
import { EmployeeDetail } from '../pages/employees/EmployeeDetail';
import { AddEditEmployee } from '../pages/employees/AddEditEmployee';
import { DepartmentManagement } from '../pages/departments/DepartmentManagement';
import { DesignationManagement } from '../pages/designations/DesignationManagement';
import { AttendanceManagement } from '../pages/attendance/AttendanceManagement';
import { LeaveManagement } from '../pages/leave/LeaveManagement';
import { PayrollManagement } from '../pages/payroll/PayrollManagement';
import { DocumentManagement } from '../pages/documents/DocumentManagement';
import { PerformanceManagement } from '../pages/performance/PerformanceManagement';
import { Announcements } from '../pages/announcements/Announcements';
import { Reports } from '../pages/reports/Reports';
import { AuditLogs } from '../pages/audit/AuditLogs';
import { Notifications } from '../pages/notifications/Notifications';
import { Settings } from '../pages/settings/Settings';

export const HRRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="teachers" element={<TeacherManagement />} />
      <Route path="staff" element={<StaffManagement />} />
      <Route path="employees" element={<Navigate to="/hr/teachers" replace />} />
      <Route path="employees/new" element={<AddEditEmployee />} />
      <Route path="employees/:id" element={<EmployeeDetail />} />
      <Route path="employees/:id/edit" element={<AddEditEmployee />} />
      <Route path="departments" element={<DepartmentManagement />} />
      <Route path="designations" element={<DesignationManagement />} />
      <Route path="attendance" element={<AttendanceManagement />} />
      <Route path="leave" element={<LeaveManagement />} />
      <Route path="payroll" element={<PayrollManagement />} />
      <Route path="documents" element={<DocumentManagement />} />
      <Route path="performance" element={<PerformanceManagement />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="reports" element={<Reports />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
export default HRRoutes;
