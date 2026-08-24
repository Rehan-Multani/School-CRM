import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import { SchoolAdminBrandingEffect } from './SchoolAdminBrandingEffect';
import { SchoolAdminThemeScope } from './SchoolAdminThemeScope';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { useSchoolAdminNotifications } from '../../context/SchoolAdminNotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';
import { AnimatePresence, motion } from 'framer-motion';

export const SchoolAdminLayout = () => {
  const { user, loading, hasPlan } = useSchoolAdminAuth();
  const { mergeInbox, addNotification } = useSchoolAdminNotifications();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'school-admin',
    user,
    mergeInbox,
    onPush: (item) => addNotification(item.title, item.message, 'info'),
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
    if (!hasPlan) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPlan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/school-admin/login" replace />;
  }

  const onPlansPage = location.pathname.startsWith('/school-admin/plans');
  if (!hasPlan && !onPlansPage) {
    return <Navigate to="/school-admin/plans" replace />;
  }

  return (
    <SchoolAdminThemeScope className="min-h-screen flex bg-slate-50 text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-200">
      <SchoolAdminBrandingEffect />
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
              className="relative w-64 bg-slate-950 h-full flex flex-col z-10"
            >
              {/* Sidebar content locally embedded or toggle sidebar width values */}
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen relative max-w-full overflow-x-hidden transition-[margin] duration-200 ${isCollapsed ? 'md:ml-[68px]' : 'md:ml-64'}`}>
        {/* Header/TopBar */}
        <TopBar 
          onMenuClick={() => setMobileMenuOpen(true)} 
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </SchoolAdminThemeScope>
  );
};
export default SchoolAdminLayout;
