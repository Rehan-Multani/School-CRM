import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const SchoolConfig = lazy(() => import('../pages/school-config/SchoolConfig').then((m) => ({ default: m.SchoolConfig })));
const RolesAndPermissions = lazy(() => import('../pages/roles/RolesAndPermissions').then((m) => ({ default: m.RolesAndPermissions })));
const UserManagement = lazy(() => import('../pages/users/UserManagement').then((m) => ({ default: m.UserManagement })));
const UserDetail = lazy(() => import('../pages/users/UserDetail'));
const AdmissionManagement = lazy(() => import('../pages/admissions/AdmissionManagement').then((m) => ({ default: m.AdmissionManagement })));
const AcademicIndex = lazy(() => import('../pages/academics/AcademicIndex'));
const AcademicYearsIndex = lazy(() => import('../pages/academics/AcademicYearsIndex'));
const AcademicYearDetail = lazy(() => import('../pages/academics/AcademicYearDetail'));
const ClassesIndex = lazy(() => import('../pages/academics/ClassesIndex'));
const SubjectsIndex = lazy(() => import('../pages/academics/SubjectsIndex'));
const SectionDetail = lazy(() => import('../pages/academics/SectionDetail'));
const SubjectAssignments = lazy(() => import('../pages/academics/SubjectAssignments').then((m) => ({ default: m.SubjectAssignments })));
const ClassTeachers = lazy(() => import('../pages/academics/ClassTeachers').then((m) => ({ default: m.ClassTeachers })));
const AttendanceHub = lazy(() => import('../pages/attendance/AttendanceHub').then((m) => ({ default: m.AttendanceHub })));
const ExamManagement = lazy(() => import('../pages/exams/ExamManagement').then((m) => ({ default: m.ExamManagement })));
const ExamDetail = lazy(() => import('../pages/exams/ExamDetail').then((m) => ({ default: m.ExamDetail })));
const FeeManagement = lazy(() => import('../pages/fees/FeeManagement').then((m) => ({ default: m.FeeManagement })));
const FeeHeadsIndex = lazy(() => import('../pages/fees/FeeHeadsIndex').then((m) => ({ default: m.FeeHeadsIndex })));
const FeeStructuresIndex = lazy(() => import('../pages/fees/FeeStructuresIndex').then((m) => ({ default: m.FeeStructuresIndex })));
const FeeStructureDetail = lazy(() => import('../pages/fees/FeeStructureDetail').then((m) => ({ default: m.FeeStructureDetail })));
const StudentManagement = lazy(() => import('../pages/students/StudentManagement').then((m) => ({ default: m.StudentManagement })));
const StudentDetail = lazy(() => import('../pages/students/StudentDetail'));
const TeacherManagement = lazy(() => import('../pages/teachers/TeacherManagement').then((m) => ({ default: m.TeacherManagement })));
const TeacherDetail = lazy(() => import('../pages/teachers/TeacherDetail'));
const HomeworkMonitor = lazy(() => import('../pages/homework/HomeworkMonitor').then((m) => ({ default: m.HomeworkMonitor })));
const CommunicationHub = lazy(() => import('../pages/communication/CommunicationHub').then((m) => ({ default: m.CommunicationHub })));
const NotificationsIndex = lazy(() => import('../pages/notifications/NotificationsIndex'));
const TransportManagement = lazy(() => import('../pages/transport/TransportManagement').then((m) => ({ default: m.TransportManagement })));
const HostelManagement = lazy(() => import('../pages/hostel/HostelManagement').then((m) => ({ default: m.HostelManagement })));
const LibraryDashboard = lazy(() => import('../pages/library/LibraryDashboard').then((m) => ({ default: m.LibraryDashboard })));
const LibraryBooks = lazy(() => import('../pages/library/LibraryBooks').then((m) => ({ default: m.LibraryBooks })));
const LibraryCategories = lazy(() => import('../pages/library/LibraryCategories').then((m) => ({ default: m.LibraryCategories })));
const LibraryRules = lazy(() => import('../pages/library/LibraryRules').then((m) => ({ default: m.LibraryRules })));
const LibraryReports = lazy(() => import('../pages/library/LibraryReports').then((m) => ({ default: m.LibraryReports })));
const HRAndPayroll = lazy(() => import('../pages/hr/HRAndPayroll').then((m) => ({ default: m.HRAndPayroll })));
const DepartmentManagement = lazy(() => import('../pages/hr/DepartmentManagement').then((m) => ({ default: m.DepartmentManagement })));
const DesignationManagement = lazy(() => import('../pages/hr/DesignationManagement').then((m) => ({ default: m.DesignationManagement })));
const PerformanceReviews = lazy(() => import('../pages/hr/PerformanceReviews').then((m) => ({ default: m.PerformanceReviews })));
const InventoryManagement = lazy(() => import('../pages/inventory/InventoryManagement').then((m) => ({ default: m.InventoryManagement })));
const EventsManagement = lazy(() => import('../pages/events/EventsManagement').then((m) => ({ default: m.EventsManagement })));
const ReportsHub = lazy(() => import('../pages/reports/ReportsHub').then((m) => ({ default: m.ReportsHub })));
const AuditLogs = lazy(() => import('../pages/audit/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const Support = lazy(() => import('../pages/support/Support').then((m) => ({ default: m.Support })));
const Settings = lazy(() => import('../pages/settings/Settings').then((m) => ({ default: m.Settings })));
const SafePickup = lazy(() => import('../pages/settings/SafePickup').then((m) => ({ default: m.SafePickup })));
const SafePickupHistory = lazy(() => import('../pages/settings/SafePickupHistory').then((m) => ({ default: m.SafePickupHistory })));
const SafePickupOperations = lazy(() => import('../pages/safe-pickup/SafePickup').then((m) => ({ default: m.SafePickup })));
const SafePickupOperationsHistory = lazy(() => import('../pages/safe-pickup/SafePickupHistory').then((m) => ({ default: m.SafePickupHistory })));
const SubscriptionPlans = lazy(() => import('../pages/plans/SubscriptionPlans'));

// Shown in the content area while a page's code is being downloaded.
const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-indigo-500" />
  </div>
);

export const SchoolAdminRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="plans" element={<SubscriptionPlans />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="school-config" element={<SchoolConfig />} />
      <Route path="roles" element={<RolesAndPermissions />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="users/:userId" element={<UserDetail />} />
      <Route path="admissions" element={<AdmissionManagement />} />
      <Route path="academics" element={<AcademicIndex />} />
      <Route path="academics/years" element={<AcademicYearsIndex />} />
      <Route path="academics/years/:yearId" element={<AcademicYearDetail />} />
      <Route path="academics/years/:yearId/sections/:sectionId" element={<SectionDetail />} />
      <Route path="academics/classes" element={<ClassesIndex />} />
      <Route path="academics/subjects" element={<SubjectsIndex />} />
      <Route path="academics/subject-assignments" element={<SubjectAssignments />} />
      <Route path="academics/class-teachers" element={<ClassTeachers />} />
      <Route path="attendance" element={<AttendanceHub />} />
      <Route path="exams" element={<ExamManagement />} />
      <Route path="exams/:examId" element={<ExamDetail />} />
      <Route path="fees" element={<FeeManagement />} />
      <Route path="fees/heads" element={<FeeHeadsIndex />} />
      <Route path="fees/structures" element={<FeeStructuresIndex />} />
      <Route path="fees/structures/:id" element={<FeeStructureDetail />} />
      <Route path="students" element={<StudentManagement />} />
      <Route path="students/:studentId" element={<StudentDetail />} />
      <Route path="teachers" element={<TeacherManagement />} />
      <Route path="teachers/:teacherId" element={<TeacherDetail />} />
      <Route path="homework" element={<HomeworkMonitor />} />
      <Route path="communication" element={<CommunicationHub />} />
      <Route path="notifications" element={<NotificationsIndex />} />
      <Route path="transport" element={<TransportManagement />} />
      <Route path="hostel" element={<HostelManagement />} />
      <Route path="library" element={<Navigate to="/school-admin/library/dashboard" replace />} />
      <Route path="library/dashboard" element={<LibraryDashboard />} />
      <Route path="library/books" element={<LibraryBooks />} />
      <Route path="library/categories" element={<LibraryCategories />} />
      <Route path="library/rules" element={<LibraryRules />} />
      <Route path="library/reports" element={<LibraryReports />} />
      <Route path="library/settings" element={<Navigate to="/school-admin/library/rules" replace />} />
      <Route path="hr" element={<HRAndPayroll />} />
      <Route path="hr/departments" element={<DepartmentManagement />} />
      <Route path="hr/designations" element={<DesignationManagement />} />
      <Route path="hr/reviews" element={<PerformanceReviews />} />
      <Route path="inventory" element={<InventoryManagement />} />
      <Route path="events" element={<EventsManagement />} />
      <Route path="reports" element={<ReportsHub />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="support" element={<Support />} />
      <Route path="settings" element={<Settings />} />
      <Route path="settings/safe-pickup" element={<SafePickup />} />
      <Route path="settings/safe-pickup/history" element={<SafePickupHistory />} />
      <Route path="safe-pickup" element={<SafePickupOperations />} />
      <Route path="safe-pickup/history" element={<SafePickupOperationsHistory />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
    </Suspense>
  );
};
export default SchoolAdminRoutes;
