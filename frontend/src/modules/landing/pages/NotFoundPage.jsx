import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { PRODUCT } from '../data/content';

export const NotFoundPage = () => {
  useEffect(() => {
    document.title = `Page not found Ã¢â¬â ${PRODUCT.name}`;
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-6 text-5xl font-black tracking-tight text-slate-900 dark:text-white">404</p>
      <h1 className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-200">
        We couldn't find that page
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        The link may be broken or the page may have moved.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-600"
        >
          Staff sign in
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

