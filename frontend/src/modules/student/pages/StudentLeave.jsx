import React, { useState } from 'react';
import { useLeave } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { FilePlus, Calendar, MessageSquare, Plus } from 'lucide-react';

export const StudentLeave = () => {
  const { leaveHistory, applyLeave } = useLeave();
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason || !startDate || !endDate) {
      alert('Please fill in all the details.');
      return;
    }
    applyLeave({ reason, startDate, endDate });
    setReason('');
    setStartDate('');
    setEndDate('');
    alert('Leave application submitted successfully!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Apply Form */}
      <Card className="lg:col-span-1 h-fit">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
          Apply For Leave
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              End Date
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Reason for Leave
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Suffering from high fever, medical prescription will be attached..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-semibold shadow-premium transition-all active:scale-95 duration-100 select-none"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Application</span>
          </button>
        </form>
      </Card>

      {/* Right Column: History */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Application History</h3>
        {leaveHistory.length === 0 ? (
          <EmptyState 
            title="No Applications Found" 
            description="You have not submitted any leave requests yet."
            icon={FilePlus}
          />
        ) : (
          leaveHistory.map((lv) => (
            <Card key={lv.id} className="p-5 border border-border">
              <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    lv.status === 'Approved' ? 'success' : 
                    lv.status === 'Rejected' ? 'danger' : 'warning'
                  }>
                    {lv.status}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold">ID: {lv.id}</span>
                </div>
                
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {lv.startDate} to {lv.endDate}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {lv.reason}
              </p>

              {lv.comments && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">
                    Teacher remarks: "{lv.comments}"
                  </p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

    </div>
  );
};
