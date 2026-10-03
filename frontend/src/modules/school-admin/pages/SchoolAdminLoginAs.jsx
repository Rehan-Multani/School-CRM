import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useSchoolAdminAuth } from '../context/SchoolAdminAuthContext';

// Landing page for the Super Admin panel's "Login as school". The link carries
// a one-time code after the `#` (never sent to a server in the URL); it is
// swapped here for a school-admin session and removed from the address bar.
export const SchoolAdminLoginAs = () => {
  const { loginWithCode } = useSchoolAdminAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // The code works once — React's development double-run must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('code') || '';
    window.history.replaceState(null, '', window.location.pathname);

    if (!code) {
      setError('This login link is not valid. Open the school again from the Super Admin panel.');
      return;
    }

    loginWithCode(code)
      .then((user) => navigate(user?.hasPlan || user?.subscriptionPlan ? '/school-admin/dashboard' : '/school-admin/plans', { replace: true }))
      .catch((err) =>
        setError(err?.response?.data?.message || err?.message || 'Could not open this school. Please try again from the Super Admin panel.'),
      );
  }, [loginWithCode, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {error ? (
          <>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Could not open the school</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
            <Link
              to="/school-admin/login"
              className="mt-6 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Go to school login
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <h1 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Opening the school panel…</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Signing you in as this school.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SchoolAdminLoginAs;
