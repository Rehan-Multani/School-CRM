ï»¿import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Web-portal tile, shared by the landing "Portals" section and the
// /login portal picker.
export const PortalCard = ({ portal }) => {
  const Icon = portal.icon;
  return (
    <Link
      to={portal.href}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-500/15 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{portal.name}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {portal.blurb || portal.desc}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
        Open portal
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
};

export default PortalCard;
