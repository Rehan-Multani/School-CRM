import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';
import { usePrincipalNotifications } from '../../context/PrincipalNotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';
import { AnimatePresence, motion } from 'framer-motion';

export const PrincipalLayout = () => {
  const { user, loading } = usePrincipalAuth();
  const { mergeInbox, addNotification } = usePrincipalNotifications();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'principal',
    user,
    mergeInbox,
    onPush: (item) => addNotification({ ...item, type: 'Announcements' }),
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Setup Command Palette shortcut (Ctrl+K)
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
        <div className="w-10 h-10 rounded-full border-t-2 border-emerald-600 animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/principal/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* Desktop Navigation Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Mobile Drawer (collapsible off-canvas) */}
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
              className="relative w-72 bg-slate-950 h-full flex flex-col z-10"
            >
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-x-hidden">
        {/* Header/TopBar */}
        <TopBar 
          onMenuClick={() => setMobileMenuOpen(true)} 
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 px-4 py-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
};
export default PrincipalLayout;
