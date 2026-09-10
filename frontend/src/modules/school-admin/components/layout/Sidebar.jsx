import React, { useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../utils/constants';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { cn } from '../../utils/cn';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import SchoolAdminBrandLogo from '../ui/SchoolAdminBrandLogo';
import { UserAvatar } from '../ui/UserAvatar';

const NavItem = ({ item, isCollapsed, isActive }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      end
      title={isCollapsed ? item.name : undefined}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors duration-150 select-none',
        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-indigo-600 hover:text-foreground dark:hover:text-slate-100'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!isCollapsed && <span className="truncate">{item.name}</span>}
    </NavLink>
  );
};

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user, hasPlan } = useSchoolAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/school-admin/login');
  };

  const navItems = hasPlan
    ? NAVIGATION_ITEMS
    : NAVIGATION_ITEMS.filter((item) => item.path === '/school-admin/plans');

  // Find the single best-matching navigation item (longest matching prefix)
  const activeItemPath = useMemo(() => {
    const current = location.pathname;
    let best = null;

    for (const item of navItems) {
      const isMatch =
        current === item.path ||
        (current.startsWith(`${item.path}/`) && item.path !== '/school-admin');

      if (isMatch) {
        if (!best || item.path.length > best.path.length) {
          best = item;
        }
      }
    }

    return best ? best.path : null;
  }, [location.pathname, navItems]);

  const categories = navItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <aside
      className={cn(
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-[width] duration-200',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-slate-200 px-3 py-4 dark:border-slate-800',
          isCollapsed ? 'justify-center' : 'justify-between gap-2'
        )}
      >
        <div className={cn('flex min-w-0 items-center', isCollapsed ? 'justify-center' : 'gap-2.5')}>
          <SchoolAdminBrandLogo className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground dark:text-white leading-tight">
                {user?.schoolName || 'School'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Admin Portal</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex shrink-0 justify-center border-b border-slate-200 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
                  <NavItem
                    key={item.name}
                    item={item}
                    isCollapsed={isCollapsed}
                    isActive={activeItemPath === item.path}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {user && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-2 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div
            className={cn(
              'flex items-center rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-indigo-600/50',
              isCollapsed ? 'justify-center' : 'gap-2.5'
            )}
          >
            <UserAvatar
              src={user.photo}
              name={user.name}
              className="h-8 w-8 shrink-0 rounded-full text-xs"
            />
            {!isCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground dark:text-slate-200">
                    {user.name}
                  </p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-indigo-600/10 dark:hover:text-rose-400"
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
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-indigo-600/10"
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

