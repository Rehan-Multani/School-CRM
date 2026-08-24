import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TeacherDashboard } from '../pages/TeacherDashboard';
import { TeacherProfile } from '../pages/TeacherProfile';
import { TeacherClasses } from '../pages/TeacherClasses';
import { TeacherAttendance } from '../pages/TeacherAttendance';
import { TeacherHomework } from '../pages/TeacherHomework';
import { TeacherExamination } from '../pages/TeacherExamination';
import { TeacherAcademics } from '../pages/TeacherAcademics';
import { TeacherTimetable } from '../pages/TeacherTimetable';
import { TeacherPerformance } from '../pages/TeacherPerformance';
import { TeacherLeave } from '../pages/TeacherLeave';
import { TeacherMessages } from '../pages/TeacherMessages';
import { TeacherAnnouncements } from '../pages/TeacherAnnouncements';
import { TeacherEvents } from '../pages/TeacherEvents';
import { TeacherNotifications } from '../pages/TeacherNotifications';
import { TeacherDownloads } from '../pages/TeacherDownloads';
import { TeacherSettings } from '../pages/TeacherSettings';

export const TeacherRoutes = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<TeacherDashboard />} />
      <Route path="profile" element={<TeacherProfile />} />
      <Route path="classes" element={<TeacherClasses />} />
      <Route path="attendance" element={<TeacherAttendance />} />
      <Route path="homework" element={<TeacherHomework />} />
      <Route path="examination" element={<TeacherExamination />} />
      <Route path="academics" element={<TeacherAcademics />} />
      <Route path="timetable" element={<TeacherTimetable />} />
      <Route path="performance" element={<TeacherPerformance />} />
      <Route path="leave" element={<TeacherLeave />} />
      <Route path="messages" element={<TeacherMessages />} />
      <Route path="announcements" element={<TeacherAnnouncements />} />
      <Route path="events" element={<TeacherEvents />} />
      <Route path="notifications" element={<TeacherNotifications />} />
      <Route path="downloads" element={<TeacherDownloads />} />
      <Route path="settings" element={<TeacherSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
