import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Library, FolderTree, SlidersHorizontal, BookMarked, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const labelClass = 'mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300';

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDisplayDate(dateStr);
}

export const LIBRARY_TABS = [
  { id: 'dashboard', label: 'Dashboard', path: '/school-admin/library/dashboard', icon: LayoutGrid },
  { id: 'books', label: 'Books', path: '/school-admin/library/books', icon: Library },
  { id: 'categories', label: 'Categories', path: '/school-admin/library/categories', icon: FolderTree },
  { id: 'rules', label: 'Rules', path: '/school-admin/library/rules', icon: SlidersHorizontal },
  { id: 'reports', label: 'Reports', path: '/school-admin/library/reports', icon: BookMarked },
  { id: 'settings', label: 'Settings', path: '/school-admin/library/settings', icon: Settings },
];

export const LibraryTabsNav = () => (
  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
    {LIBRARY_TABS.map((tab) => {
      const Icon = tab.icon;
      return (
        <NavLink
          key={tab.id}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm',
              isActive
                ? 'bg-primary text-white shadow-primary/20'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            )
          }
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{tab.label}</span>
        </NavLink>
      );
    })}
  </div>
);

// Consistent badge color per category name so the same subject always renders
// the same chip color across Books/Categories/Reports without a hardcoded list.
const BADGE_VARIANTS = ['primary', 'info', 'purple', 'warning', 'success', 'cyan', 'orange', 'default'];
export function categoryBadgeVariant(name) {
  const str = String(name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return BADGE_VARIANTS[hash % BADGE_VARIANTS.length];
}

export const BORROWER_TYPE_BADGE = {
  STUDENT: 'info',
  TEACHER: 'primary',
  STAFF: 'purple',
};

export const ISSUE_STATUS_BADGE = {
  ISSUED: 'warning',
  OVERDUE: 'danger',
  RETURNED: 'success',
};

export const RESERVATION_STATUS_BADGE = {
  PENDING: 'warning',
  APPROVED: 'info',
  FULFILLED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'default',
};
