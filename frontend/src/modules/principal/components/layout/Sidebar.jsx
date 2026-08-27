import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../utils/constants';
import { usePrincipalAuth } from '../../context/PrincipalAuthContext';
import { cn } from '../../utils/cn';
import { LogOut, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import BrandLogo from '../../../../shared/ui/BrandLogo';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${API_BASE_URL}/platform${path.startsWith('/') ? path : `/${path}`}`;
}

const NavItem = ({ item, isCollapsed }) => {
  const Icon = item.icon;
  const location = useLocation();

  const isActive =
    location.pathname === item.path ||
    (item.path !== '/principal/dashboard' && location.pathname.startsWith(`${item.path}/`));

  return (
    <NavLink
      to={item.path}
      title={isCollapsed ? item.name : undefined}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors duration-150 select-none',
        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-foreground dark:hover:text-slate-100'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!isCollapsed && <span className="truncate">{item.name}</span>}
    </NavLink>
  );
};

export const Sidebar = ({ isCollapsed, setIsCollapsed, isOpen, toggleSidebar }) => {
  const { logout, user } = usePrincipalAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/principal/login');
  };

  const categories = NAVIGATION_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-[width,transform] duration-200 select-none',
        isCollapsed ? 'md:w-[68px] w-64' : 'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-slate-200 px-3 py-4 dark:border-slate-800',
          isCollapsed ? 'justify-center' : 'justify-between gap-2'
        )}
      >
        <div className={cn('flex min-w-0 items-center', isCollapsed ? 'justify-center' : 'gap-2.5')}>
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <GraduationCap className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground dark:text-white leading-tight">
                {user?.schoolName || 'School CRM'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Principal Portal</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="hidden md:flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {isCollapsed && (
        <div className="hidden md:flex shrink-0 justify-center border-b border-slate-200 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Categorized Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" style={{ minHeight: 0 }}>
        <div className="space-y-5">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              {!isCollapsed && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {category}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavItem key={item.name} item={item} isCollapsed={isCollapsed} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User Footer Card */}
      {user && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-2 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div
            className={cn(
              'flex items-center rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/50',
              isCollapsed ? 'justify-center' : 'gap-2.5'
            )}
          >
            <div className="h-8 w-8 rounded-full bg-indigo-600/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
              {user.photo ? (
                <img src={buildFileUrl(user.photo)} alt={user.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span>{user.name ? user.name.charAt(0).toUpperCase() : 'P'}</span>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground dark:text-slate-200">
                    {user.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user.role || 'Principal'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {isCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
