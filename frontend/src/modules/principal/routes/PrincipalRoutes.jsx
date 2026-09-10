import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { StudentManagement } from '../pages/students/StudentManagement';
import StudentDetail from '../pages/students/StudentDetail';
import { TeacherManagement } from '../pages/teachers/TeacherManagement';
import TeacherDetail from '../pages/teachers/TeacherDetail';
import { StaffManagement } from '../pages/staff/StaffManagement';
import StaffDetail from '../pages/staff/StaffDetail';
import AcademicIndex from '../pages/academics/AcademicIndex';
import AcademicYearsIndex from '../pages/academics/AcademicYearsIndex';
import AcademicYearDetail from '../pages/academics/AcademicYearDetail';
import ClassesIndex from '../pages/academics/ClassesIndex';
import SubjectsIndex from '../pages/academics/SubjectsIndex';
import SectionDetail from '../pages/academics/SectionDetail';
import { SubjectAssignments } from '../pages/academics/SubjectAssignments';
import { ClassTeachers } from '../pages/academics/ClassTeachers';
import { AttendanceMonitoring } from '../pages/attendance/AttendanceMonitoring';
import { ExaminationMonitoring } from '../pages/exams/ExaminationMonitoring';
import { ExamDetail } from '../pages/exams/ExamDetail';
import { HomeworkMonitoring } from '../pages/homework/HomeworkMonitoring';
import { FeeMonitoring } from '../pages/fees/FeeMonitoring';
import { LeaveApproval } from '../pages/leave/LeaveApproval';
import { Meetings } from '../pages/meetings/Meetings';
import { Events } from '../pages/events/Events';
import { Reports } from '../pages/reports/Reports';
import { Notifications } from '../pages/notifications/Notifications';
import { Settings } from '../pages/settings/Settings';

export const PrincipalRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="students" element={<StudentManagement />} />
      <Route path="students/:studentId" element={<StudentDetail />} />
      <Route path="teachers" element={<TeacherManagement />} />
      <Route path="teachers/:teacherId" element={<TeacherDetail />} />
      <Route path="staff" element={<StaffManagement />} />
      <Route path="staff/:userId" element={<StaffDetail />} />
      <Route path="academics" element={<AcademicIndex />} />
      <Route path="academics/years" element={<AcademicYearsIndex />} />
      <Route path="academics/years/:yearId" element={<AcademicYearDetail />} />
      <Route path="academics/years/:yearId/sections/:sectionId" element={<SectionDetail />} />
      <Route path="academics/classes" element={<ClassesIndex />} />
      <Route path="academics/subjects" element={<SubjectsIndex />} />
      <Route path="academics/subject-assignments" element={<SubjectAssignments />} />
      <Route path="academics/class-teachers" element={<ClassTeachers />} />
      <Route path="classes" element={<Navigate to="/principal/academics/classes" replace />} />
      <Route path="subjects" element={<Navigate to="/principal/academics/subjects" replace />} />
      <Route path="attendance" element={<AttendanceMonitoring />} />
      <Route path="exams" element={<ExaminationMonitoring />} />
      <Route path="exams/:examId" element={<ExamDetail />} />
      <Route path="homework" element={<HomeworkMonitoring />} />
      <Route path="fees" element={<FeeMonitoring />} />
      <Route path="leave" element={<LeaveApproval />} />
      <Route path="meetings" element={<Meetings />} />
      <Route path="communication" element={<Navigate to="/principal/notifications" replace />} />
      <Route path="events" element={<Events />} />
      <Route path="reports" element={<Reports />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
export default PrincipalRoutes;
