import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import { useTransportAuth } from '../../context/TransportAuthContext';
import { useTransportNotifications } from '../../context/TransportNotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';
import { cn } from '../../utils/cn';

export const TransportLayout = () => {
  const { user, loading } = useTransportAuth();
  const { mergeInbox, addNotification } = useTransportNotifications();
  const location = useLocation();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'transport',
    user,
    mergeInbox,
    onPush: (item) => addNotification(item.title, item.message, 'info'),
  });
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle Ctrl+K / Cmd+K keydown listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-550 dark:bg-slate-950 flex items-center justify-center font-bold text-slate-400">
        Loading Transport Fleet Module...
      </div>
    );
  }

  // Guard routes
  if (!user && location.pathname !== '/transport/login') {
    return <Navigate to="/transport/login" replace />;
  }

  if (user && (location.pathname === '/transport' || location.pathname === '/transport/login')) {
    return <Navigate to="/transport/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      <Sidebar 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />

      <div className={cn(
        "min-h-screen flex flex-col transition-all duration-300", 
        isCollapsed ? "md:pl-20" : "md:pl-68 lg:pl-72"
      )}>
        <TopBar 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          onSearchTrigger={() => setCommandPaletteOpen(true)}
        />

        <main className="p-6 md:p-8 flex-1 max-w-[1400px] w-full mx-auto">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
    </div>
  );
};
