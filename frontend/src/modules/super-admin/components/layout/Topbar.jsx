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
          className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all rounded-lg px-3 py-1.5 w-64 text-left text-slate-500 hover:text-slate-400 group"
        >
          <Search size={16} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm">Search panel...</span>
          <div className="ml-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 dark:text-slate-400 px-1.5 py-0.5 rounded">
            Ctrl+K
          </div>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-150 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Dropdown modal={false}>
          <DropdownTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-150 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:text-slate-200"
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
