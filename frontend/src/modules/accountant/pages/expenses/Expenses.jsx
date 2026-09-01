import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  TrendingDown, 
  Plus, 
  Receipt, 
  Trash2, 
  Building, 
  Zap, 
  BookOpen, 
  FileText,
  CreditCard
} from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Utilities & Bills',
  'School Maintenance',
  'Stationery & Printing',
  'Science & Computer Labs',
  'Campus Sports & Events',
  'Library Acquisitions',
  'Administrative / Misc'
];

export const Expenses = () => {
  const { store, addExpense, deleteExpense } = useAppStore();
  const { showToast, ToastComponent } = useToast();
  const expenses = store?.expenses || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [form, setForm] = useState({
    title: '',
    category: 'Utilities & Bills',
    payee: '',
    amount: '',
    paymentMethod: 'Bank Transfer',
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    notes: ''
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilitiesTotal = expenses
    .filter((e) => e.category === 'Utilities & Bills')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const maintenanceTotal = expenses
    .filter((e) => e.category === 'School Maintenance')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = selectedCategory === 'All Categories'
    ? expenses
    : expenses.filter((e) => e.category === selectedCategory);

  const handleOpenModal = () => {
    setForm({
      title: '',
      category: 'Utilities & Bills',
      payee: '',
      amount: '',
      paymentMethod: 'Bank Transfer',
      date: new Date().toISOString().split('T')[0],
      voucherNo: `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.payee) {
      showToast('Please fill out title, payee, and amount.', 'error');
      return;
    }

    addExpense({
      title: form.title,
      category: form.category,
      payee: form.payee,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      date: form.date,
      voucherNo: form.voucherNo,
      notes: form.notes
    });

    showToast(`Expense voucher ${form.voucherNo} recorded successfully.`, 'success');
    setIsModalOpen(false);
  };

  const handleDelete = (id, voucherNo) => {
    deleteExpense(id);
    showToast(`Expense voucher ${voucherNo} removed.`, 'info');
  };

  const columns = [
    {
      key: 'voucherNo',
      title: 'Voucher No',
      sortable: true,
      render: (v) => <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{v}</span>
    },
    {
      key: 'title',
      title: 'Expense Title & Payee',
      sortable: true,
      render: (v, row) => (
        <div>
          <div className="font-bold text-slate-850 dark:text-slate-100">{v}</div>
          <div className="text-[11px] text-slate-400">Payee: {row.payee}</div>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      render: (v) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {v}
        </span>
      )
    },
    {
      key: 'paymentMethod',
      title: 'Payment Mode',
      render: (v) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {v}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (v) => (
        <span className="font-bold text-rose-600 dark:text-rose-400">
          {formatCurrency(v || 0)}
        </span>
      )
    },
    {
      key: 'date',
      title: 'Date',
      sortable: true,
      render: (v) => formatDate(v)
    },
    {
      key: 'status',
      title: 'Status',
      render: (v) => <Badge variant={v === 'Paid' ? 'success' : 'warning'}>{v || 'Paid'}</Badge>
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id, row.voucherNo);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          title="Delete Expense"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Expenses Management"
        subtitle="Record operational costs, vendor invoices, utility bills, and track school expenditure history."
        actions={
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          subtitle="recorded in session"
          icon={TrendingDown}
        />
        <StatCard
          title="Utilities & Power"
          value={formatCurrency(utilitiesTotal)}
          subtitle="electricity, internet, water"
          icon={Zap}
        />
        <StatCard
          title="Campus Maintenance"
          value={formatCurrency(maintenanceTotal)}
          subtitle="repairs & facilities"
          icon={Building}
        />
        <StatCard
          title="Expense Vouchers"
          value={`${expenses.length}`}
          subtitle="cleared debit vouchers"
          icon={Receipt}
        />
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* DataTable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredExpenses}
          searchPlaceholder="Search expense by title, payee, or voucher number..."
          searchKey="title"
          emptyMessage="No expense records found for this category."
        />
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Record New School Expense"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="block text-slate-600 dark:text-slate-400">Expense Title / Description *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Science Laboratory Reagents & Supplies"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                >
                  {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Payee / Vendor Name *</label>
                <input
                  type="text"
                  value={form.payee}
                  onChange={(e) => setForm({ ...form, payee: e.target.value })}
                  placeholder="e.g. Apex Scientific Supplies"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Amount (₹) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 25000"
                  required
                  min="1"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Payment Method *</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Cash">Petty Cash</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Voucher / Invoice Reference</label>
                <input
                  type="text"
                  value={form.voucherNo}
                  onChange={(e) => setForm({ ...form, voucherNo: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Expense Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-600 dark:text-slate-400">Remarks / Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Details of the purchase, sanction reference, or department bill approval"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                Record Expense
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};
export default Expenses;
