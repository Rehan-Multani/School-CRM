import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x && x !== 'librarian');

  if (location.pathname === '/librarian/dashboard') return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 overflow-x-auto whitespace-nowrap py-1">
      <Link
        to="/librarian/dashboard"
        className="flex items-center gap-1 text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      
      {pathnames.map((value, index) => {
        const to = `/librarian/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const formattedName = value
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="text-slate-800 dark:text-slate-200 font-bold max-w-[150px] truncate">
                {formattedName}
              </span>
            ) : (
              <Link
                to={to}
                className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[120px] truncate"
              >
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
