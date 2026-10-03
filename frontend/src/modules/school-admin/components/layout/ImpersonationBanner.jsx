import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';

// Shown on every school-admin page while a Super Admin is visiting this school
// ("Login as school"). It is deliberately loud: everything done here is saved
// to the real school.
export const ImpersonationBanner = () => {
  const { impersonation, user, logout } = useSchoolAdminAuth();
  const navigate = useNavigate();
  if (!impersonation) return null;

  const exit = () => {
    logout();
    // The visit opened in its own tab; closing it returns to the Super Admin
    // panel. A tab the browser will not close falls back to the login page.
    window.close();
    navigate('/school-admin/login', { replace: true });
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-xs font-semibold text-amber-950"
    >
      <span className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Super Admin view — you are signed in as <strong>{user?.schoolName || 'this school'}</strong>. Changes you make here are
          real.
        </span>
      </span>
      <button
        type="button"
        onClick={exit}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-900"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit school
      </button>
    </div>
  );
};

export default ImpersonationBanner;
