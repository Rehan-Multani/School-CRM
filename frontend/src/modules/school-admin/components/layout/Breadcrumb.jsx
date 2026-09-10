import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Capitalize path names cleanly
  const formatName = (str) => {
    return str
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-6 select-none overflow-x-auto no-scrollbar">
      <Link
        to="/school-admin/dashboard"
        className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {pathnames.slice(1).map((value, index) => {
        const to = `/${pathnames.slice(0, index + 2).join('/')}`;
        const isLast = index === pathnames.length - 2;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 text-slate-350 dark:text-slate-700 shrink-0" />
            {isLast ? (
              <span className="text-slate-800 dark:text-slate-200 font-bold max-w-[200px] truncate">
                {formatName(value)}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {formatName(value)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
