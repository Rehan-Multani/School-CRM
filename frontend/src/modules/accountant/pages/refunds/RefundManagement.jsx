import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { MOCK_REFUNDS, MOCK_STUDENTS, MOCK_COLLECTIONS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CornerUpLeft } from 'lucide-react';

export const RefundManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const { showToast, ToastComponent } = useToast();
  const [refunds, setRefunds] = useState(MOCK_REFUNDS);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('Bank Transfer');

  // Approve State Dialog
  const [approveRefundId, setApproveRefundId] = useState(null);

  const handleCreateRefundRequest = (e) => {
    e.preventDefault();
    if (!studentId || !receiptId || !reason) return;

    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (!student) return;

    const newRefund = {
      id: `REF-00${refunds.length + 1}`,
      receiptId: receiptId,
      studentId: studentId,
      studentName: student.name,
      amount: Number(amount),
      reason: reason,
      status: 'Pending',
      refundMethod: refundMethod,
      createdAt: new Date().toISOString()
    };

    setRefunds([newRefund, ...refunds]);
    showToast(`Refund request registered for student: ${student.name}!`, 'success');

    // Reset Form
    setStudentId('');
    setReceiptId('');
    setReason('');
  };

  const handleApproveConfirm = () => {
    if (!approveRefundId) return;
    const record = refunds.find(r => r.id === approveRefundId);
    if (!record) return;

    setRefunds(prev => prev.map(r => r.id === approveRefundId ? { ...r, status: 'Approved' } : r));
    showToast(`Refund REF #${approveRefundId} approved for disbursement. Transaction logged.`, 'success');
    setApproveRefundId(null);
  };

  const pendingColumns = [
    { key: 'id', title: 'Refund ID', sortable: true },
    { key: 'studentName', title: 'Student Name', sortable: true },
    { key: 'receiptId', title: 'Orig Receipt ID' },
    { key: 'amount', title: 'Refund Amount', render: (val) => <span className="font-bold">{formatCurrency(val)}</span> },
    { key: 'refundMethod', title: 'Channel' },
    { key: 'createdAt', title: 'Date Requested', render: (val) => formatDate(val) },
    { 
      key: 'actions', 
      title: 'Disbursement actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setApproveRefundId(row.id)}
            className="px-2.5 py-1 text-[10px] font-bold text-white bg-violet-605 hover:bg-violet-700 rounded-lg shadow-sm"
          >
            Approve Refund
          </button>
        </div>
      )
    }
  ];

  const archiveColumns = [
    { key: 'id', title: 'Refund ID', sortable: true },
    { key: 'studentName', title: 'Student Name', sortable: true },
    { key: 'receiptId', title: 'Orig Receipt ID' },
    { key: 'amount', title: 'Refund Amount', render: (val) => <span className="font-bold">{formatCurrency(val)}</span> },
    { key: 'refundMethod', title: 'Channel' },
    { key: 'createdAt', title: 'Date Requested', render: (val) => formatDate(val) },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => <Badge variant={val === 'Approved' ? 'success' : 'default'}>{val}</Badge>
    }
  ];

  const pendingRefunds = refunds.filter(r => r.status === 'Pending');
  const archiveRefunds = refunds.filter(r => r.status !== 'Pending');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Refund Management" 
        subtitle="Manage excess fee payment refund requests, view approval states, and record disbursement channels." 
      />

      <Tabs 
        tabs={[
          { id: 'pending', label: `Pending Approvals (${pendingRefunds.length})` },
          { id: 'archive', label: 'Refund History Archive' },
          { id: 'create', label: 'File Refund Request' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'pending' && (
        <DataTable 
          columns={pendingColumns} 
          data={pendingRefunds} 
          searchPlaceholder="Search pending refunds..."
          searchKey="studentName"
          emptyMessage="All pending refunds processed."
        />
      )}

      {activeTab === 'archive' && (
        <DataTable 
          columns={archiveColumns} 
          data={archiveRefunds} 
          searchPlaceholder="Search refund archive..."
          searchKey="studentName"
        />
      )}

      {activeTab === 'create' && (
        <form onSubmit={handleCreateRefundRequest} className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Select Student</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full bg-slate-55 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
              >
                <option value="">-- Choose Student --</option>
                {MOCK_STUDENTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Class {s.class}-{s.section})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Select Reference Receipt ID</label>
              <select
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
                required
                className="w-full bg-slate-55 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
              >
                <option value="">-- Choose Receipt ID --</option>
                {MOCK_COLLECTIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.id} (Paid {formatCurrency(c.paidAmount)})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Refund Amount (INR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-55 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Disbursement channel</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full bg-slate-55 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
              >
                <option value="Bank Transfer">Direct Bank Transfer</option>
                <option value="UPI">UPI Refund</option>
                <option value="Cash">Cash at Desk</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-455 block">Reason Statement Justification</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification notes for the refund..."
              required
              className="w-full bg-slate-55 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <CornerUpLeft className="w-4 h-4" />
              <span>Submit Refund Request</span>
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={approveRefundId !== null}
        onClose={() => setApproveRefundId(null)}
        onConfirm={handleApproveConfirm}
        title="Approve Fee Refund Disbursement"
        message="Are you sure you want to approve this refund? Approved funds will be marked as disbursed, updating active accounting logs."
        confirmText="Approve Refund"
        variant="success"
      />

      <ToastComponent />
    </div>
  );
};
export default RefundManagement;
