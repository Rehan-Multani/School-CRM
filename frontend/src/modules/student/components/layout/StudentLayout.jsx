import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useStudentNotifications } from '../../context/NotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';

export const StudentLayout = () => {
  const { user, loading } = useStudentAuth();
  const { mergeInbox, addNotification } = useStudentNotifications();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'student',
    user,
    mergeInbox,
    onPush: (item) => addNotification(item),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/student/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Desktop Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-x-hidden">
        {/* Mobile Navigation Header */}
        <TopBar />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>

        {/* Mobile Navigation Bottom Bar */}
        <BottomNav />
      </div>
    </div>
  );
};
