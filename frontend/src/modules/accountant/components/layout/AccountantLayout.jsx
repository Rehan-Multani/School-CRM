import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { CommandPalette } from './CommandPalette';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { useAccountantNotifications } from '../../context/AccountantNotificationContext';
import { usePlatformPush } from '../../../../shared/hooks/usePlatformPush';
import { AnimatePresence, motion } from 'framer-motion';

export const AccountantLayout = () => {
  const { user, loading } = useAccountantAuth();
  const { mergeInbox, addNotification } = useAccountantNotifications();

  usePlatformPush({
    enabled: Boolean(user),
    role: 'accountant',
    user,
    mergeInbox,
    onPush: (item) => addNotification(item),
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
        <div className="w-10 h-10 rounded-full border-t-2 border-violet-600 animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/accountant/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-200 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-955"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-slate-955 h-full flex flex-col z-10"
            >
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-x-hidden">
        <TopBar 
          onMenuClick={() => setMobileMenuOpen(true)} 
          onSearchClick={() => setCommandPaletteOpen(true)}
        />

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
export default AccountantLayout;
