import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServerTable } from '../../components/ui/ServerTable';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { accountantApi } from '../../../../shared/api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../../../shared/lib/exportHelpers';
import { PAYMENT_METHODS } from '../../utils/constants';
import { TrendingDown, Plus, Receipt, Trash2, Pencil, Download, Search } from 'lucide-react';

const PAYMENT_STATUSES = ['PAID', 'PENDING', 'PARTIAL'];
const APPROVAL_STATUSES = ['APPROVED', 'PENDING', 'REJECTED'];

const emptyForm = () => ({
  title: '',
  category: '',
  vendorName: '',
  amount: '',
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  approvalStatus: 'APPROVED',
  expenseDate: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
});

export const Expenses = () => {
  const { showToast, ToastComponent } = useToast();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

  const [filters, setFilters] = useState({ search: '', category: '', paymentStatus: '', page: 1 });
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', form }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCategories = () =>
    accountantApi.expenseCategories().then((res) => setCategories(res?.data || [])).catch(() => {});

  useEffect(() => {
    loadCategories();
  }, []);

  const fetchList = () => {
    setLoading(true);
    setError(null);
    const params = { page: filters.page, limit: 15 };
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    accountantApi
      .expenses(params)
      .then((res) => {
        setRows(res?.data || []);
        setPagination(res?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      })
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchList, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const sum = rows.reduce((s, e) => s + (e.amount || 0), 0);
    return { sum, count: pagination.total };
  }, [rows, pagination.total]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const submit = (e) => {
    e.preventDefault();
    const f = modal.form;
    if (!f.title || !f.category || !f.amount) {
      return showToast('Title, category and amount are required', 'error');
    }
    setSaving(true);
    const payload = {
      title: f.title,
      category: f.category,
      vendorName: f.vendorName,
      amount: Number(f.amount),
      paymentMethod: f.paymentMethod,
      paymentStatus: f.paymentStatus,
      approvalStatus: f.approvalStatus,
      expenseDate: f.expenseDate,
      reference: f.reference,
      notes: f.notes,
    };
    const req =
      modal.mode === 'edit'
        ? accountantApi.updateExpense(modal.id, payload)
        : accountantApi.createExpense(payload);
    req
      .then(() => {
        showToast(modal.mode === 'edit' ? 'Expense updated' : 'Expense recorded', 'success');
        setModal(null);
        loadCategories();
        fetchList();
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Save failed', 'error'))
      .finally(() => setSaving(false));
  };

  const doDelete = () => {
    accountantApi
      .deleteExpense(confirmDelete.id)
      .then(() => {
        showToast(`Expense ${confirmDelete.expenseNumber} removed`, 'info');
        setConfirmDelete(null);
        fetchList();
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Delete failed', 'error'));
  };

  const columns = useMemo(
    () => [
      { key: 'expenseNumber', title: 'Voucher', render: (r) => (
        <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{r.expenseNumber}</span>
      ) },
      { key: 'title', title: 'Title & Vendor', render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.title}</p>
          <p className="text-[10px] text-slate-400">{r.vendorName || '—'}</p>
        </div>
      ) },
      { key: 'category', title: 'Category' },
      { key: 'paymentMethod', title: 'Method' },
      { key: 'amount', title: 'Amount', align: 'right', render: (r) => (
        <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(r.amount)}</span>
      ) },
      { key: 'expenseDate', title: 'Date', render: (r) => formatDate(r.expenseDate) },
      { key: 'paymentStatus', title: 'Payment', render: (r) => (
        <Badge variant={r.paymentStatus === 'PAID' ? 'success' : 'warning'}>{r.paymentStatus}</Badge>
      ) },
      { key: 'approvalStatus', title: 'Approval', render: (r) => (
        <Badge variant={r.approvalStatus === 'APPROVED' ? 'success' : r.approvalStatus === 'REJECTED' ? 'danger' : 'warning'}>
          {r.approvalStatus}
        </Badge>
      ) },
      { key: 'actions', title: 'Actions', render: (r) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() =>
              setModal({
                mode: 'edit',
                id: r.id,
                expenseNumber: r.expenseNumber,
                form: {
                  title: r.title,
                  category: r.category,
                  vendorName: r.vendorName || '',
                  amount: String(r.amount),
                  paymentMethod: r.paymentMethod,
                  paymentStatus: r.paymentStatus,
                  approvalStatus: r.approvalStatus,
                  expenseDate: (r.expenseDate || '').split('T')[0],
                  reference: r.reference || '',
                  notes: r.notes || '',
                },
              })
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(r)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Record operational costs, vendor bills and utilities. Categories & vendors are managed inline."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!rows.length) return showToast('Nothing to export', 'info');
                exportToCSV(rows, `expenses_${new Date().toISOString().split('T')[0]}.csv`);
                showToast('Current page exported to CSV', 'success');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setModal({ mode: 'create', form: emptyForm() })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Expenses (this page)" value={formatCurrency(totals.sum)} subtitle="sum of shown rows" icon={TrendingDown} />
        <StatCard title="Total Vouchers" value={`${totals.count}`} subtitle="matching filters" icon={Receipt} />
        <StatCard title="Categories" value={`${categories.length}`} subtitle="in use + defaults" icon={Receipt} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search title, vendor, voucher…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentStatus}
          onChange={(e) => set({ paymentStatus: e.target.value })}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
        >
          <option value="">All Payment Statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ServerTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => set({ page: p })}
        emptyMessage="No expenses match the current filters."
      />

      {modal && (
        <Modal isOpen onClose={() => setModal(null)} title={modal.mode === 'edit' ? 'Edit Expense' : 'Record New Expense'}>
          <form onSubmit={submit} className="space-y-4 text-xs font-semibold">
            <Field label="Title / Description *">
              <input
                value={modal.form.title}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, title: e.target.value } }))}
                required
                className="inp"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category *">
                <input
                  list="expense-categories"
                  value={modal.form.category}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, category: e.target.value } }))}
                  required
                  className="inp"
                />
                <datalist id="expense-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Vendor / Payee">
                <input
                  value={modal.form.vendorName}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, vendorName: e.target.value } }))}
                  className="inp"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹) *">
                <input
                  type="number"
                  min="1"
                  value={modal.form.amount}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, amount: e.target.value } }))}
                  required
                  className="inp"
                />
              </Field>
              <Field label="Expense Date">
                <input
                  type="date"
                  value={modal.form.expenseDate}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, expenseDate: e.target.value } }))}
                  className="inp"
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Method">
                <select
                  value={modal.form.paymentMethod}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, paymentMethod: e.target.value } }))}
                  className="inp"
                >
                  {PAYMENT_METHODS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment Status">
                <select
                  value={modal.form.paymentStatus}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, paymentStatus: e.target.value } }))}
                  className="inp"
                >
                  {PAYMENT_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Approval">
                <select
                  value={modal.form.approvalStatus}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, approvalStatus: e.target.value } }))}
                  className="inp"
                >
                  {APPROVAL_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Reference / Invoice No">
              <input
                value={modal.form.reference}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, reference: e.target.value } }))}
                className="inp font-mono"
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={2}
                value={modal.form.notes}
                onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, notes: e.target.value } }))}
                className="inp"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50">
                {saving ? 'Saving…' : modal.mode === 'edit' ? 'Save Changes' : 'Record Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirmDelete(null)}
          onConfirm={doDelete}
          title="Delete expense"
          message={`Permanently remove ${confirmDelete.expenseNumber} (${formatCurrency(confirmDelete.amount)})?`}
          confirmText="Delete"
          variant="danger"
        />
      )}

      <style>{`.inp{width:100%;background:rgb(248 250 252);border:1px solid rgb(226 232 240);border-radius:.75rem;padding:.5rem .75rem;font-size:.75rem}.dark .inp{background:rgb(30 41 59);border-color:rgb(51 65 85)}`}</style>
      <ToastComponent />
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="block text-slate-600 dark:text-slate-400">{label}</span>
    {children}
  </label>
);

export default Expenses;
