import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { useToast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../../../shared/store/useAppStore';
import { LEAVE_TYPES } from '../utils/constants';
import { FilePlus, Clock, CheckCircle, XCircle, Calendar, Check, X, UserCheck } from 'lucide-react';

const statusVariant = { Approved: 'success', Pending: 'warning', Rejected: 'danger' };
const statusIcon = {
  Approved: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  Pending: <Clock className="w-4 h-4 text-amber-500" />,
  Rejected: <XCircle className="w-4 h-4 text-rose-500" />,
};

export const TeacherLeave = () => {
  const toast = useToast();
  const { store, applyLeave, approveLeave } = useAppStore();

  const [tab, setTab] = useState('apply');
  const [form, setForm] = useState({ type: LEAVE_TYPES[0] || 'Casual Leave', from: '', to: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const teacherStaff = store.staff.find(s => s.id === 'EMP101' || s.name?.includes('Rajesh Kumar')) || {
    leaveBalance: { casual: 8, sick: 10, earned: 15, unpaid: 0 }
  };

  const allLeaves = store.leaves || [];
  const teacherHistory = allLeaves.filter(l => l.applicantId === 'EMP101' || (l.applicantType === 'Staff' && l.applicantName?.includes('Rajesh')));
  const studentLeaves = allLeaves.filter(l => l.applicantType === 'Student');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.from || !form.to) { toast.error('Please select leave dates'); return; }
    if (new Date(form.to) < new Date(form.from)) { toast.error('End date must be after start date'); return; }

    const days = Math.max(1, Math.round((new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24)) + 1);

    applyLeave({
      applicantType: 'Staff',
      applicantId: 'EMP101',
      applicantName: 'Mr. Rajesh Kumar',
      department: 'Mathematics',
      leaveType: form.type,
      startDate: form.from,
      endDate: form.to,
      days,
      reason: form.reason
    });

    toast.success('Leave application submitted! Forwarded to Principal & HR for approval.');
    setForm({ type: LEAVE_TYPES[0] || 'Casual Leave', from: '', to: '', reason: '' });
    setTab('history');
  };

  const handleResolveStudentLeave = (leaveId, isApproved) => {
    approveLeave(
      leaveId, 
      isApproved, 
      isApproved ? 'Approved by Class Teacher Mr. Rajesh Kumar' : 'Rejected due to upcoming Unit Test schedule',
      'Mr. Rajesh Kumar (Teacher)'
    );
    toast.success(`Student leave application ${isApproved ? 'approved' : 'rejected'}!`);
  };

  const balance = teacherStaff.leaveBalance || { casual: 8, sick: 10, earned: 15, unpaid: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Leave Management & Approvals</h2>
        <p className="text-xs text-slate-500 mt-0.5">Apply for faculty leave and approve student leave requests</p>
      </div>

      <FilterBar
        filters={[
          { value: 'apply', label: 'Apply Faculty Leave' },
          { value: 'balance', label: 'My Leave Balance' },
          { value: 'history', label: `My History (${teacherHistory.length})` },
          { value: 'student_leaves', label: `Student Leaves (${studentLeaves.filter(l => l.status === 'Pending').length} Pending)` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Apply Leave */}
      {tab === 'apply' && (
        <Card className="p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Faculty Leave Application</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Dispatched to Principal & HR department</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Leave Category</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              >
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">From Date</label>
                <input
                  type="date"
                  required
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">To Date</label>
                <input
                  type="date"
                  required
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason for Absence</label>
              <textarea
                rows={3}
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="State detailed reason..."
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              Submit Application to Principal & HR
            </button>
          </form>
        </Card>
      )}

      {/* Leave Balance */}
      {tab === 'balance' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border-l-4 border-indigo-500">
            <span className="text-xs font-bold text-slate-400 uppercase">Casual Leave Available</span>
            <div className="text-3xl font-black text-indigo-600 mt-2">{balance.casual} Days</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Valid for 2026-2027 Academic Session</span>
          </Card>
          <Card className="p-5 border-l-4 border-emerald-500">
            <span className="text-xs font-bold text-slate-400 uppercase">Sick Leave Available</span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{balance.sick} Days</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Medical certificate required &gt; 2 days</span>
          </Card>
          <Card className="p-5 border-l-4 border-amber-500">
            <span className="text-xs font-bold text-slate-400 uppercase">Earned / Vacation Leave</span>
            <div className="text-3xl font-black text-amber-600 mt-2">{balance.earned} Days</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Subject to management approval</span>
          </Card>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My Leave Applications Registry</h3>
          {teacherHistory.length === 0 ? (
            <EmptyState title="No Leave Applications" description="You have not submitted any leave applications this session." />
          ) : (
            <div className="divide-y divide-border">
              {teacherHistory.map(l => (
                <div key={l.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{l.leaveType}</span>
                      <Badge variant={statusVariant[l.status] || 'default'}>{l.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{l.reason}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{l.startDate} to {l.endDate} ({l.days} days) • Approver: {l.approverName || 'Principal Dr. Chatterjee'}</span>
                  </div>
                  {l.comments && (
                    <div className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                      {l.comments}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Student Leaves */}
      {tab === 'student_leaves' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Class 10-A Student Leave Requests</h3>
          {studentLeaves.length === 0 ? (
            <EmptyState title="No Student Leave Requests" description="There are no pending student leave requests." />
          ) : (
            <div className="divide-y divide-border">
              {studentLeaves.map(sl => (
                <div key={sl.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{sl.applicantName}</span>
                      <span className="text-xs text-slate-400 font-semibold">({sl.applicantId || '10-A'})</span>
                      <Badge variant={statusVariant[sl.status] || 'default'}>{sl.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{sl.reason}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">{sl.startDate} to {sl.endDate} ({sl.days} days) • Category: {sl.leaveType}</span>
                  </div>

                  {sl.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveStudentLeave(sl.id, false)}
                        className="px-3 py-1 text-xs font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleResolveStudentLeave(sl.id, true)}
                        className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
                      >
                        Approve Leave
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">{sl.comments || 'Resolved'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
export default TeacherLeave;
