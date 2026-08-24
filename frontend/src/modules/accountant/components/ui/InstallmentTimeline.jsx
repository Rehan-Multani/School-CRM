import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const InstallmentTimeline = ({ plan }) => {
  if (!plan || !plan.installments) return null;

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase text-slate-400">Total Plan Value</span>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{formatCurrency(plan.totalAmount)}</h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-slate-400">Payer Name</span>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{plan.studentName}</p>
        </div>
      </div>

      <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6 ml-3">
        {plan.installments.map((inst) => {
          const isPaid = inst.status === 'Paid';
          const isOverdue = inst.status === 'Overdue';
          const isPending = inst.status === 'Pending';

          return (
            <div key={inst.seq} className="relative">
              {/* Dot Icon marker */}
              <div className="absolute -left-9.5 top-0.5">
                {isPaid ? (
                  <div className="bg-emerald-500 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : isOverdue ? (
                  <div className="bg-rose-500 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="bg-slate-350 text-white rounded-full p-0.5 border-4 border-white dark:border-slate-900 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Installment Info */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">Installment #{inst.seq}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                      isPaid 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' 
                        : isOverdue 
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' 
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {inst.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Due Date: {formatDate(inst.dueDate)}</p>
                  {isPaid && inst.paidDate && (
                    <p className="text-[10px] text-emerald-600">Paid on: {formatDate(inst.paidDate)}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{formatCurrency(inst.amount)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default InstallmentTimeline;
