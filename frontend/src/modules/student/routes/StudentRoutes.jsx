import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentDashboard } from '../pages/StudentDashboard';
import { StudentProfile } from '../pages/StudentProfile';
import { StudentAttendance } from '../pages/StudentAttendance';
import { StudentHomework } from '../pages/StudentHomework';
import { StudentExams } from '../pages/StudentExams';
import { StudentResults } from '../pages/StudentResults';
import { StudentAcademics } from '../pages/StudentAcademics';
import { StudentTimetable } from '../pages/StudentTimetable';
import { StudentFees } from '../pages/StudentFees';
import { StudentTransport } from '../pages/StudentTransport';
import { StudentHostel } from '../pages/StudentHostel';
import { StudentLibrary } from '../pages/StudentLibrary';
import { StudentLeave } from '../pages/StudentLeave';
import { StudentAnnouncements } from '../pages/StudentAnnouncements';
import { StudentEvents } from '../pages/StudentEvents';
import { StudentNotifications } from '../pages/StudentNotifications';
import { StudentMessages } from '../pages/StudentMessages';
import { StudentDownloads } from '../pages/StudentDownloads';
import { StudentSettings } from '../pages/StudentSettings';

export const StudentRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<StudentDashboard />} />
      <Route path="profile" element={<StudentProfile />} />
      <Route path="attendance" element={<StudentAttendance />} />
      <Route path="homework" element={<StudentHomework />} />
      <Route path="exams" element={<StudentExams />} />
      <Route path="results" element={<StudentResults />} />
      <Route path="academics" element={<StudentAcademics />} />
      <Route path="timetable" element={<StudentTimetable />} />
      <Route path="fees" element={<StudentFees />} />
      <Route path="transport" element={<StudentTransport />} />
      <Route path="hostel" element={<StudentHostel />} />
      <Route path="library" element={<StudentLibrary />} />
      <Route path="leave" element={<StudentLeave />} />
      <Route path="announcements" element={<StudentAnnouncements />} />
      <Route path="events" element={<StudentEvents />} />
      <Route path="notifications" element={<StudentNotifications />} />
      <Route path="messages" element={<StudentMessages />} />
      <Route path="downloads" element={<StudentDownloads />} />
      <Route path="settings" element={<StudentSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
