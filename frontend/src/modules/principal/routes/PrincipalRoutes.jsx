import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { StudentMonitoring } from '../pages/students/StudentMonitoring';
import { TeacherMonitoring } from '../pages/teachers/TeacherMonitoring';
import { AcademicMonitoring } from '../pages/academics/AcademicMonitoring';
import { AttendanceMonitoring } from '../pages/attendance/AttendanceMonitoring';
import { ExaminationMonitoring } from '../pages/exams/ExaminationMonitoring';
import { HomeworkMonitoring } from '../pages/homework/HomeworkMonitoring';
import { LeaveApproval } from '../pages/leave/LeaveApproval';
import { Meetings } from '../pages/meetings/Meetings';
import { Communication } from '../pages/communication/Communication';
import { Events } from '../pages/events/Events';
import { Reports } from '../pages/reports/Reports';
import { Notifications } from '../pages/notifications/Notifications';
import { Settings } from '../pages/settings/Settings';

export const PrincipalRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="students" element={<StudentMonitoring />} />
      <Route path="teachers" element={<TeacherMonitoring />} />
      <Route path="academics" element={<AcademicMonitoring />} />
      <Route path="attendance" element={<AttendanceMonitoring />} />
      <Route path="exams" element={<ExaminationMonitoring />} />
      <Route path="homework" element={<HomeworkMonitoring />} />
      <Route path="leave" element={<LeaveApproval />} />
      <Route path="meetings" element={<Meetings />} />
      <Route path="communication" element={<Communication />} />
      <Route path="events" element={<Events />} />
      <Route path="reports" element={<Reports />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
export default PrincipalRoutes;
