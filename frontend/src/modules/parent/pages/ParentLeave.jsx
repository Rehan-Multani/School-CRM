import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { FileUpload } from '../components/ui/FileUpload';
import { useToast } from '../components/ui/Toast';
import { MOCK_LEAVE } from '../data/mockData';
import { FilePlus, Clock, CheckCircle, XCircle, Calendar, ArrowRight } from 'lucide-react';

const statusVariant = { Approved: 'success', Pending: 'warning', Rejected: 'danger' };
const statusIcon = {
  Approved: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  Pending: <Clock className="w-4 h-4 text-amber-500" />,
  Rejected: <XCircle className="w-4 h-4 text-rose-500" />,
};

export const ParentLeave = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('apply');
  const [form, setForm] = useState({ reason: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);

  // Sync state with localStorage 'school_student_leaves'
  const loadLeaves = () => {
    const stored = localStorage.getItem('school_student_leaves');
    if (stored) {
      const list = JSON.parse(stored);
      // Filter list or let hooks do it, but here we can just show all leaves mapped or filter by student ID if we stored child ID in them.
      // Wait, in student hooks, we mapped:
      // { id, reason, startDate, endDate, status, comments }
      // Let's check how we initialized student leave history:
      // MOCK_LEAVE initially does not have childId, but we can filter or fallback
      setLeaveHistory(list);
    } else {
      setLeaveHistory(MOCK_LEAVE);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [selectedChildId]);

  useEffect(() => {
    window.addEventListener('storage', loadLeaves);
    return () => window.removeEventListener('storage', loadLeaves);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.from || !form.to) { toast.error('Please select dates'); return; }
    if (new Date(form.to) < new Date(form.from)) { toast.error('To date must be after From date'); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);

    // Save leave to database
    const newLeave = {
      id: `lv-${Math.floor(100 + Math.random() * 900)}`,
      reason: form.reason,
      startDate: form.from,
      endDate: form.to,
      status: 'Pending',
      comments: null
    };

    const updated = [newLeave, ...leaveHistory];
    setLeaveHistory(updated);
    localStorage.setItem('school_student_leaves', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    toast.success('Child leave application submitted!');
    setForm({ reason: '', from: '', to: '' });
    setTab('history');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Leave Application</h2>
        <p className="text-xs text-slate-500 mt-0.5">Submit sick or casual leave requests on behalf of your child</p>
      </div>

      <FilterBar
        filters={[
          { value: 'apply', label: 'Apply Leave' },
          { value: 'history', label: `Applications Log (${leaveHistory.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Apply Leave */}
      {tab === 'apply' && (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Apply Sibling Leave</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Approval will be processed by child's class teacher</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From Date</label>
                <input
                  type="date"
                  required
                  value={form.from}
                  onChange={(e) => setForm(p => ({ ...p, from: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  id="leave-from"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To Date</label>
                <input
                  type="date"
                  required
                  value={form.to}
                  onChange={(e) => setForm(p => ({ ...p, to: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  id="leave-to"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Absence</label>
              <textarea
                required
                rows={4}
                value={form.reason}
                onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Provide a valid explanation for child's absence..."
                className="w-full px-4 py-3 rounded-2xl border border-border bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                id="leave-reason"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attach Medical Slip / Application Proof</label>
              <FileUpload label="Upload File Attachment" maxFiles={1} accept=".pdf,.png,.jpg" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3.5 rounded-2xl text-sm font-bold shadow-premium transition-all active:scale-95 select-none"
              id="leave-submit"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><FilePlus className="w-4 h-4" /> Submit Application</>
              )}
            </button>
          </form>
        </Card>
      )}

      {/* Leave Logs History */}
      {tab === 'history' && (
        <div className="space-y-3">
          {leaveHistory.map((lv) => (
            <Card key={lv.id}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {statusIcon[lv.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[lv.status] || 'default'}>{lv.status}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-400">ID: {lv.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lv.startDate} → {lv.endDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">" {lv.reason} "</p>
                  {lv.comments && (
                    <p className="text-[10px] text-primary mt-2 font-bold">Feedback remarks: {lv.comments}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
