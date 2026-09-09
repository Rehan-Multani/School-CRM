import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Settings, LogOut, User } from 'lucide-react';
import { useSuperAdminTheme } from '../../context/SuperAdminThemeContext';
import { useSuperAdminAuth } from '../../context/SuperAdminAuthContext';
import { Dropdown, DropdownTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/Dropdown';

export const Topbar = ({ onOpenCommandPalette }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useSuperAdminTheme();
  const { admin, logout } = useSuperAdminAuth();

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 select-none">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="group flex w-64 items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-left text-slate-500 shadow-2xs transition-all hover:border-slate-300 hover:bg-white hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-300 cursor-pointer"
        >
          <Search size={16} className="transition-transform group-hover:scale-110 text-slate-400" />
          <span className="text-xs font-medium">Search panel...</span>
          <div className="ml-auto rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 shadow-2xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
            Ctrl+K
          </div>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:scale-105 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
          title="Toggle color theme"
          aria-label="Toggle color theme"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
        </button>

        <Dropdown modal={false}>
          <DropdownTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-2xs transition-all hover:scale-105 hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100 cursor-pointer"
              aria-label="Profile menu"
            >
              {admin?.avatar ? (
                <img src={admin.avatar} alt={admin.name || 'Profile'} className="h-full w-full object-cover" />
              ) : (
                <User size={18} />
              )}
            </button>
          </DropdownTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer"
              onSelect={() => navigate('/super-admin/settings')}
            >
              <Settings size={15} className="text-slate-400" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2.5 cursor-pointer text-rose-500 focus:bg-rose-50 focus:text-rose-600 dark:focus:bg-rose-500/10 dark:focus:text-rose-400"
              onSelect={handleLogout}
            >
              <LogOut size={15} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </header>
  );
};
