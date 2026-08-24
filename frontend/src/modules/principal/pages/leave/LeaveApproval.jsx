import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { ShieldCheck, History, Award, CheckCircle, XCircle } from 'lucide-react';

export const LeaveApproval = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const { showToast, ToastComponent } = useToast();
  const { store, approveLeave } = useAppStore();

  const leaves = store.leaves || [];
  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const resolvedLeaves = leaves.filter(l => l.status !== 'Pending');

  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (id) => {
    approveLeave(id, true, 'Approved by Principal Dr. S. Chatterjee', 'Dr. S. Chatterjee (Principal)');
    showToast('Leave request approved! Balance deducted and institutional attendance updated.', 'success');
  };

  const handleReject = (e) => {
    e.preventDefault();
    if (!confirmRejectId) return;

    approveLeave(confirmRejectId, false, rejectReason || 'Administrative disapproval based on term timetable.', 'Dr. S. Chatterjee (Principal)');
    showToast('Leave request rejected with remarks.', 'info');
    setConfirmRejectId(null);
    setRejectReason('');
  };

  const pendingColumns = [
    { key: 'applicantName', title: 'Applicant Name', sortable: true },
    { key: 'applicantType', title: 'Type', render: (val) => <Badge variant="info">{val}</Badge> },
    { key: 'department', title: 'Dept / Class', render: (val, row) => val || row.class || 'Faculty' },
    { key: 'leaveType', title: 'Category' },
    { key: 'dates', title: 'Leave Duration', render: (_, row) => `${row.startDate} to ${row.endDate} (${row.days} days)` },
    { key: 'reason', title: 'Statement / Reason' },
    { 
      key: 'actions', 
      title: 'Principal Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setConfirmRejectId(row.id)}
            className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all"
          >
            Reject
          </button>
          <button
            onClick={() => handleApprove(row.id)}
            className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm"
          >
            Approve
          </button>
        </div>
      )
    }
  ];

  const historyColumns = [
    { key: 'applicantName', title: 'Applicant Name', sortable: true },
    { key: 'applicantType', title: 'Type' },
    { key: 'leaveType', title: 'Category' },
    { key: 'dates', title: 'Duration', render: (_, row) => `${row.startDate} to ${row.endDate}` },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => (
        <Badge variant={val === 'Approved' ? 'success' : 'danger'}>
          {val}
        </Badge>
      )
    },
    { key: 'comments', title: 'Manager / Principal Remarks' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Leave Approval Desk" 
        subtitle="Review institutional faculty and student leave requests, authorize absences, and audit operational rosters." 
      />

      <Tabs 
        tabs={[
          { id: 'pending', label: 'Pending Requests', count: pendingLeaves.length },
          { id: 'history', label: 'Approved & Historical Logs', count: resolvedLeaves.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm">
        <DataTable 
          columns={activeTab === 'pending' ? pendingColumns : historyColumns} 
          data={activeTab === 'pending' ? pendingLeaves : resolvedLeaves}
          searchPlaceholder="Search leave requests..." 
        />
      </div>

      {/* REJECT DIALOG */}
      <Modal isOpen={!!confirmRejectId} onClose={() => setConfirmRejectId(null)} title="Disapprove Leave Application">
        <form onSubmit={handleReject} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason for Rejection *</label>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State institutional reason..."
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmRejectId(null)}
              className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Confirm Disapproval
            </button>
          </div>
        </form>
      </Modal>

      <ToastComponent />
    </div>
  );
};
export default LeaveApproval;
