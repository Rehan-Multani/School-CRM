import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { cn } from '../ui/Button';

export const SuperAdminLayout = () => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sa_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const handleCollapse = (next) => {
    setIsCollapsed(next);
    localStorage.setItem('sa_sidebar_collapsed', JSON.stringify(next));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex">
      {/* Navigation Drawer */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={handleCollapse} />

      {/* Main Core Container — padding tracks sidebar width */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          isCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        {/* Navigation Header */}
        <Topbar onOpenCommandPalette={() => setPaletteOpen(true)} />

        {/* Dynamic Nested Routes */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Launcher Menu */}
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  );
};
