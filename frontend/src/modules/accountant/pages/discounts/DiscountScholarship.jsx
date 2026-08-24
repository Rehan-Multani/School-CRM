import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { MOCK_DISCOUNTS, MOCK_STUDENTS } from '../../utils/constants';
import { Percent, ShieldAlert } from 'lucide-react';

export const DiscountScholarship = () => {
  const [activeTab, setActiveTab] = useState('list');
  const { showToast, ToastComponent } = useToast();
  const [discounts, setDiscounts] = useState(MOCK_DISCOUNTS);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [discountType, setDiscountType] = useState('Concession');
  const [percentage, setPercentage] = useState(10);
  const [amount, setAmount] = useState(1000);
  const [reason, setReason] = useState('');
  const [approvalRef, setApprovalRef] = useState('');

  const handleApplyConcession = (e) => {
    e.preventDefault();
    if (!studentId || !reason || !approvalRef) return;

    const student = MOCK_STUDENTS.find(s => s.id === studentId);
    if (!student) return;

    const newDiscount = {
      id: `DSC-00${discounts.length + 1}`,
      studentId: studentId,
      studentName: student.name,
      type: discountType,
      percentage: Number(percentage),
      amount: Number(amount),
      reason: reason,
      approvalRef: approvalRef,
      status: 'Pending'
    };

    setDiscounts([newDiscount, ...discounts]);
    showToast(`Concession concession registered for ${student.name}!`, 'success');

    // Reset Form
    setStudentId('');
    setReason('');
    setApprovalRef('');
  };

  const columns = [
    { key: 'studentName', title: 'Student Name', sortable: true },
    { 
      key: 'type', 
      title: 'Type',
      render: (val) => (
        <Badge variant={val === 'Scholarship' ? 'success' : val === 'Concession' ? 'info' : 'warning'}>
          {val}
        </Badge>
      )
    },
    { key: 'percentage', title: 'Concession (%)', render: (val) => <span>{val}%</span> },
    { key: 'amount', title: 'Flat Offset Amount', render: (val) => <span>₹{val}</span> },
    { key: 'approvalRef', title: 'Approval Reference No' },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => (
        <Badge variant={val === 'Approved' ? 'success' : 'warning'}>
          {val}
        </Badge>
      )
    },
    { key: 'reason', title: 'Verification Reason' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Discount & Scholarship Management" 
        subtitle="Manage approved sibling concessions, academic merit scholarships, and special waivers." 
      />

      <Tabs 
        tabs={[
          { id: 'list', label: 'Concessions & Waivers Registry' },
          { id: 'apply', label: 'Apply Custom Waiver Concession' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'list' && (
        <DataTable 
          columns={columns} 
          data={discounts} 
          searchPlaceholder="Search active concessions..."
          searchKey="studentName"
        />
      )}

      {activeTab === 'apply' && (
        <form onSubmit={handleApplyConcession} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Select Target Student File</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
              >
                <option value="">-- Choose Student --</option>
                {MOCK_STUDENTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Class {s.class}-{s.section})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Concession Type category</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
              >
                <option value="Concession">Sibling Concession</option>
                <option value="Scholarship">Merit Academic Scholarship</option>
                <option value="Waiver">Special Waiver Concession</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Offset Percentage (%)</label>
              <input
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Flat Discount Value (INR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-455 block">Administrative Approval Reference ID</label>
            <input
              type="text"
              value={approvalRef}
              onChange={(e) => setApprovalRef(e.target.value)}
              placeholder="e.g. APRV-2026-009..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-455 block">Justification Remarks</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context and explanation for the concession..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <Percent className="w-4 h-4" />
              <span>Apply Concession</span>
            </button>
          </div>
        </form>
      )}

      <ToastComponent />
    </div>
  );
};
export default DiscountScholarship;
