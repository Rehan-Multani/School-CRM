import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ParentDashboard } from '../pages/ParentDashboard';
import { ChildrenManagement } from '../pages/ChildrenManagement';
import { StudentProfile } from '../pages/StudentProfile';
import { ParentAttendance } from '../pages/ParentAttendance';
import { ParentHomework } from '../pages/ParentHomework';
import { ParentAcademics } from '../pages/ParentAcademics';
import { ParentTimetable } from '../pages/ParentTimetable';
import { ParentExams } from '../pages/ParentExams';
import { ParentResults } from '../pages/ParentResults';
import { ParentFees } from '../pages/ParentFees';
import { ParentTransport } from '../pages/ParentTransport';
import { ParentHostel } from '../pages/ParentHostel';
import { ParentLibrary } from '../pages/ParentLibrary';
import { ParentLeave } from '../pages/ParentLeave';
import { ParentMessages } from '../pages/ParentMessages';
import { ParentAnnouncements } from '../pages/ParentAnnouncements';
import { ParentEvents } from '../pages/ParentEvents';
import { ParentNotifications } from '../pages/ParentNotifications';
import { ParentDownloads } from '../pages/ParentDownloads';
import { ParentSettings } from '../pages/ParentSettings';

export const ParentRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<ParentDashboard />} />
      <Route path="children" element={<ChildrenManagement />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="attendance" element={<ParentAttendance />} />
      <Route path="homework" element={<ParentHomework />} />
      <Route path="academics" element={<ParentAcademics />} />
      <Route path="timetable" element={<ParentTimetable />} />
      <Route path="exams" element={<ParentExams />} />
      <Route path="results" element={<ParentResults />} />
      <Route path="fees" element={<ParentFees />} />
      <Route path="transport" element={<ParentTransport />} />
      <Route path="hostel" element={<ParentHostel />} />
      <Route path="library" element={<ParentLibrary />} />
      <Route path="leave" element={<ParentLeave />} />
      <Route path="messages" element={<ParentMessages />} />
      <Route path="announcements" element={<ParentAnnouncements />} />
      <Route path="events" element={<ParentEvents />} />
      <Route path="notifications" element={<ParentNotifications />} />
      <Route path="downloads" element={<ParentDownloads />} />
      <Route path="settings" element={<ParentSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
