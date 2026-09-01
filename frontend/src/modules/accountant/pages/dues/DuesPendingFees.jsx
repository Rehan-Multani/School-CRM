import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportHelpers';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Send, 
  CreditCard, 
  Download, 
  Phone, 
  ShieldAlert,
  Calendar
} from 'lucide-react';

const SEED_DUES = [
  { id: 'DUE-101', studentName: 'Aarav Mehta', admissionNo: 'GPS202601', className: 'Class 10-A', parentName: 'Vikram Mehta', parentPhone: '+91 98112 34567', feeHead: 'Quarter 2 Tuition + Transport', amount: 18500, dueDate: '2026-08-10', daysOverdue: 21, status: 'Overdue' },
  { id: 'DUE-102', studentName: 'Ishita Sharma', admissionNo: 'GPS202612', className: 'Class 12-B', parentName: 'Ramesh Sharma', parentPhone: '+91 98223 45678', feeHead: 'Quarter 2 Tuition + Science Lab', amount: 24000, dueDate: '2026-08-10', daysOverdue: 21, status: 'Overdue' },
  { id: 'DUE-103', studentName: 'Kabir Verma', admissionNo: 'GPS202615', className: 'Class 9-C', parentName: 'Sunil Verma', parentPhone: '+91 98334 56789', feeHead: 'Quarter 2 Tuition Fee', amount: 14500, dueDate: '2026-08-15', daysOverdue: 16, status: 'Overdue' },
  { id: 'DUE-104', studentName: 'Riya Sen', admissionNo: 'GPS202619', className: 'Class 8-A', parentName: 'Deepak Sen', parentPhone: '+91 98445 67890', feeHead: 'Term 1 Balance Due', amount: 9500, dueDate: '2026-07-31', daysOverdue: 31, status: 'Critical' },
  { id: 'DUE-105', studentName: 'Aditya Roy', admissionNo: 'GPS202622', className: 'Class 12-A', parentName: 'Anil Roy', parentPhone: '+91 98556 78901', feeHead: 'Board Exam Registration + Tuition', amount: 28000, dueDate: '2026-07-25', daysOverdue: 37, status: 'Critical' },
  { id: 'DUE-106', studentName: 'Ananya Gupta', admissionNo: 'GPS202630', className: 'Class 7-B', parentName: 'Manoj Gupta', parentPhone: '+91 98667 89012', feeHead: 'Annual Development + Library', amount: 8200, dueDate: '2026-08-28', daysOverdue: 3, status: 'Upcoming' }
];

export const DuesPendingFees = () => {
  const navigate = useNavigate();
  const { store } = useAppStore();
  const { showToast, ToastComponent } = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedClass, setSelectedClass] = useState('ALL');

  // If store has students with pending dues, map them; otherwise use standard seed dues
  const duesList = useMemo(() => {
    const fromStore = (store?.students || [])
      .filter((s) => Number(s.pendingFees) > 0)
      .map((s) => ({
        id: `DUE-${s.id || s.admissionNo}`,
        studentName: s.name,
        admissionNo: s.admissionNo,
        className: s.class || 'Class 10-A',
        parentName: s.parentName || 'Guardian',
        parentPhone: s.parentPhone || '+91 98000 00000',
        feeHead: 'Quarterly Academic Fee Dues',
        amount: Number(s.pendingFees),
        dueDate: '2026-08-15',
        daysOverdue: 16,
        status: Number(s.pendingFees) > 20000 ? 'Critical' : 'Overdue'
      }));

    return fromStore.length > 0 ? fromStore : SEED_DUES;
  }, [store?.students]);

  const totalOutstanding = duesList.reduce((sum, d) => sum + d.amount, 0);
  const criticalDues = duesList.filter((d) => d.status === 'Critical' || d.daysOverdue > 30);
  const overdueCount = duesList.filter((d) => d.daysOverdue > 0).length;

  const filteredDues = useMemo(() => {
    let list = duesList;
    if (activeTab === 'critical') {
      list = list.filter((d) => d.status === 'Critical' || d.daysOverdue > 30);
    } else if (activeTab === 'overdue') {
      list = list.filter((d) => d.daysOverdue > 0);
    }

    if (selectedClass !== 'ALL') {
      list = list.filter((d) => d.className.toLowerCase().includes(selectedClass.toLowerCase()));
    }
    return list;
  }, [duesList, activeTab, selectedClass]);

  const handleRemindAll = () => {
    showToast(`Bulk SMS & App reminders dispatched to all ${filteredDues.length} parents!`, 'success');
  };

  const handleExport = () => {
    exportToCSV(filteredDues, `dues_pending_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Pending dues list exported successfully.', 'success');
  };

  const columns = [
    {
      key: 'admissionNo',
      title: 'Admn No',
      sortable: true,
      render: (v) => <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{v}</span>
    },
    {
      key: 'studentName',
      title: 'Student & Guardian',
      sortable: true,
      render: (v, row) => (
        <div>
          <div className="font-bold text-slate-850 dark:text-slate-100">{v}</div>
          <div className="text-[11px] text-slate-400">
            {row.parentName} • {row.parentPhone}
          </div>
        </div>
      )
    },
    {
      key: 'className',
      title: 'Class',
      sortable: true
    },
    {
      key: 'feeHead',
      title: 'Fee Head Description',
      render: (v) => <span className="text-slate-600 dark:text-slate-400 text-xs">{v}</span>
    },
    {
      key: 'amount',
      title: 'Pending Dues',
      sortable: true,
      render: (v) => <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(v || 0)}</span>
    },
    {
      key: 'daysOverdue',
      title: 'Overdue Status',
      sortable: true,
      render: (v, row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            v > 30
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
          }`}
        >
          {v > 30 ? `CRITICAL (${v}d past)` : `${v} Days Overdue`}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => showToast(`SMS Reminder sent to ${row.parentName} (${row.parentPhone}).`, 'success')}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 rounded-lg transition-colors"
            title="Send SMS / App Notice"
          >
            <Send className="w-3 h-3" />
            Remind
          </button>
          <button
            type="button"
            onClick={() => navigate('/accountant/fee-collection')}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg transition-colors"
            title="Collect Payment Desk"
          >
            <CreditCard className="w-3 h-3" />
            Collect
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dues & Pending Fees Desk"
        subtitle="Track outstanding fee balances, monitor overdue payments by class and student, and dispatch payment reminders."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRemindAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Remind All ({filteredDues.length})</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Outstanding Dues"
          value={formatCurrency(totalOutstanding)}
          subtitle="pending across school"
          icon={AlertTriangle}
        />
        <StatCard
          title="Overdue Accounts"
          value={`${overdueCount} Students`}
          subtitle="past payment deadlines"
          icon={Clock}
        />
        <StatCard
          title="Critical Dues (>30 Days)"
          value={`${criticalDues.length} Defaulters`}
          subtitle="urgent recovery list"
          icon={ShieldAlert}
        />
        <StatCard
          title="Total Defaulter Students"
          value={`${duesList.length}`}
          subtitle="pending fee clearance"
          icon={Users}
        />
      </div>

      {/* Filter and Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: `All Pending (${duesList.length})` },
            { id: 'critical', label: `Critical (>30d) (${criticalDues.length})` },
            { id: 'overdue', label: `Past Due (${overdueCount})` }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Classes</option>
            <option value="Class 7">Class 7</option>
            <option value="Class 8">Class 8</option>
            <option value="Class 9">Class 9</option>
            <option value="Class 10">Class 10</option>
            <option value="Class 12">Class 12</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredDues}
          searchPlaceholder="Search student by name, admission no, or guardian..."
          searchKey="studentName"
          emptyMessage="No pending dues records found."
        />
      </div>

      <ToastComponent />
    </div>
  );
};
export default DuesPendingFees;
