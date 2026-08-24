import React from 'react';
import { Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Badge } from './Badge';

export const LeaveTimeline = ({ leaves = [] }) => {
  if (leaves.length === 0) {
    return <p className="text-center text-slate-400 py-6">No leave requests registered.</p>;
  }

  return (
    <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6 ml-3 text-xs font-semibold">
      {leaves.map((leave) => {
        const isApproved = leave.status === 'Approved';
        const isPending = leave.status === 'Pending';
        const isRejected = leave.status === 'Rejected';

        return (
          <div key={leave.id} className="relative">
            {/* Status dot icon */}
            <div className="absolute -left-9.5 top-0.5">
              {isApproved ? (
                <div className="bg-emerald-500 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              ) : isPending ? (
                <div className="bg-amber-500 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="bg-rose-500 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm">
                  <XCircle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Information container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-900 dark:text-white">{leave.leaveType}</span>
                <Badge variant={isApproved ? 'success' : isPending ? 'warning' : 'danger'}>
                  {leave.status}
                </Badge>
              </div>

              <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium text-[10px]">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formatDate(leave.fromDate)} to {formatDate(leave.toDate)} ({leave.days} day{leave.days > 1 ? 's' : ''})
                </span>
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 font-normal italic text-slate-600 dark:text-slate-400">
                "{leave.reason}"
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default LeaveTimeline;
