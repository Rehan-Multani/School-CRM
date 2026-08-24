import React from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_CHILDREN_ATTENDANCE, MOCK_CHILDREN_FEES, MOCK_CHILDREN_RESULTS } from '../data/mockData';
import { Check, UserCheck, CalendarCheck, CreditCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ChildrenManagement = () => {
  const { user, selectedChildId, changeSelectedChild } = useParentAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Linked Children</h2>
        <p className="text-xs text-slate-500 mt-0.5">View and switch between linked student profiles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {user?.linkedChildren.map((c) => {
          const isSelected = c.id === selectedChildId;
          const att = MOCK_CHILDREN_ATTENDANCE[c.id];
          const fee = MOCK_CHILDREN_FEES[c.id];
          const res = MOCK_CHILDREN_RESULTS[c.id];

          return (
            <Card
              key={c.id}
              onClick={() => changeSelectedChild(c.id)}
              className={`flex flex-col gap-4 border-2 transition-all cursor-pointer relative overflow-hidden select-none ${
                isSelected ? 'border-primary shadow-premium bg-primary/[0.01]' : 'border-border hover:border-primary/20'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-primary text-white pl-4 pr-3 py-1 rounded-bl-2xl">
                  <span className="text-[9px] font-black uppercase tracking-wider">Active</span>
                </div>
              )}

              <div className="flex gap-4">
                <img
                  src={c.photo}
                  alt={c.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-border"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{c.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{c.class} - Section {c.section}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Roll No: {c.rollNo} • ID: {c.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Attendance</p>
                  <p className="text-xs font-black text-foreground mt-0.5">{att?.overallPercentage || '—'}%</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending Fees</p>
                  <p className="text-xs font-black text-rose-500 mt-0.5">₹{fee?.pendingFees || '0'}</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">GPA</p>
                  <p className="text-xs font-black text-indigo-500 mt-0.5">{res?.gpa || '—'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 mt-1 text-[11px] font-bold text-primary">
                <span>View Full Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
