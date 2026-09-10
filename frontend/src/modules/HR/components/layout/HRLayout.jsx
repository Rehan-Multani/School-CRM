import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import { useHRAuth } from '../../context/HRAuthContext';
import { useHRNotifications } from '../../context/HRNotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';
import { AnimatePresence, motion } from 'framer-motion';

export const HRLayout = () => {
  const { user, loading } = useHRAuth();
  const { mergeInbox, addNotification } = useHRNotifications();
  const location = useLocation();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'hr',
    user,
    mergeInbox,
    onPush: (item) => addNotification(item.title, item.message, 'info'),
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Setup Command Palette shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 rounded-full border-t-2 border-indigo-600 animate-spin"></div>
      </div>
    );
  }

  if (!user && location.pathname !== '/hr/login') {
    return <Navigate to="/hr/login" replace />;
  }

  if (user && (location.pathname === '/hr' || location.pathname === '/hr/login')) {
    return <Navigate to="/hr/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-200">
      {/* Desktop Navigation Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isOpen={false}
        toggleSidebar={() => {}}
      />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-64 bg-slate-950 h-full flex flex-col z-10"
            >
              <Sidebar
                isCollapsed={false}
                setIsCollapsed={() => {}}
                isOpen={true}
                toggleSidebar={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area with responsive margin */}
      <div
        className={`flex-1 flex flex-col min-h-screen relative max-w-full overflow-x-hidden transition-[margin] duration-200 ${
          isCollapsed ? 'md:ml-[68px]' : 'md:ml-64'
        }`}
      >
        {/* Header/TopBar */}
        <TopBar
          toggleSidebar={() => setMobileMenuOpen(true)}
          onSearchTrigger={() => setCommandPaletteOpen(true)}
        />

        {/* Content Body */}
        <main className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
};
export default HRLayout;
