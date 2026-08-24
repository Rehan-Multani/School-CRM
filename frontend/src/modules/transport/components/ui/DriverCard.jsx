import React from 'react';
import { Mail, Phone, Calendar, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from './Badge';
import { formatDate } from '../../utils/formatters';

export const DriverCard = ({ driver, onView, onEdit }) => {
  // Check license expiry warning (within 90 days of 2026-07-17)
  const isLicenseExpiring = new Date(driver.licenseExpiry) < new Date('2026-10-15');

  const statusVariants = {
    Active: 'success',
    'On Leave': 'warning',
    Inactive: 'default'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:border-cyan-300 dark:hover:border-cyan-900/50 group flex flex-col justify-between">
      <div>
        {/* Profile Info */}
        <div className="flex gap-4">
          <img
            src={driver.photoUrl}
            alt={driver.name}
            className="h-14 w-14 rounded-2xl border border-slate-100 dark:border-slate-800 object-cover shrink-0"
          />
          <div className="min-w-0 space-y-1">
            <Badge variant={statusVariants[driver.status]}>{driver.status}</Badge>
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {driver.name}
            </h4>
            <span className="text-4xs text-slate-450 block font-bold uppercase tracking-wider">{driver.employeeId}</span>
          </div>
        </div>

        {/* License & Warnings */}
        <div className="mt-5 space-y-3 pt-3 border-t border-slate-50 dark:border-slate-850 text-3xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-450 font-bold uppercase">License Category:</span>
            <Badge variant="cyan">{driver.licenseCategory}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-450 font-bold uppercase">License Expiry:</span>
            <span className="font-bold text-slate-700 dark:text-slate-350">{formatDate(driver.licenseExpiry)}</span>
          </div>

          {isLicenseExpiring && (
            <div className="p-2 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl flex gap-1.5 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">License is expiring soon! Renew immediately.</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => onView(driver)}
          className="flex-1 h-9 text-3xs font-bold border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all duration-150"
        >
          View Profile
        </button>
        <button
          onClick={() => onEdit(driver)}
          className="px-3.5 h-9 text-3xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-955/20 dark:hover:bg-cyan-900/30 dark:text-cyan-400 rounded-xl transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
};
