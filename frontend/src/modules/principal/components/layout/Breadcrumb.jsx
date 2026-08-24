import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // If we are at root login, don't show
  if (pathnames.includes('login')) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold mb-4 select-none">
      <Link 
        to="/principal/dashboard" 
        className="hover:text-slate-650 dark:hover:text-white flex items-center gap-1"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {pathnames.map((value, index) => {
        // Skip root context prefix path
        if (value === 'principal') return null;

        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = value
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            {last ? (
              <span className="text-slate-800 dark:text-slate-350 truncate max-w-40">
                {label}
              </span>
            ) : (
              <Link to={to} className="hover:text-slate-650 dark:hover:text-white">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
export default Breadcrumb;
