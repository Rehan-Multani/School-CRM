import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { payrollPortalApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function getCurrentMonthString() {
  const d = new Date();
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function getTodayISODate() {
  return new Date().toISOString().split('T')[0];
}

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const HRAndPayroll = () => {
  const { showToast, ToastComponent } = useToast();
  const { user } = useSchoolAdminAuth();
  const schoolName = user?.schoolName || 'Greenfield Public School';

  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    totalExpense: 0,
    totalGross: 0,
    totalDeductions: 0,
    totalCount: 0,
    paidCount: 0,
    processedCount: 0,
    onHoldCount: 0,
  });

  // Filters & Pagination
  const currentYear = new Date().getFullYear();
  const defaultMonth = `${MONTH_OPTIONS[new Date().getMonth()]} ${currentYear}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });

  // Eligible employees
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [selectedPay, setSelectedPay] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [form, setForm] = useState({
    employeeRefId: '',
    employeeType: 'STAFF',
    employeeId: '',
    employeeName: '',
    employeeEmail: '',
    employeeRole: '',
    department: '',
    designation: '',
    payrollMonth: defaultMonth,
    payrollDate: getTodayISODate(),
    basicSalary: '',
    incentive: '',
    overtime: '',
    bonus: '',
    leaveDeduction: '',
    paymentStatus: 'PROCESSED',
    paymentMethod: 'BANK_TRANSFER',
    remarks: '',
  });

  // Calculate Net Salary in realtime
  const calculation = useMemo(() => {
    const basic = Math.max(0, Number(form.basicSalary) || 0);
    const inc = Math.max(0, Number(form.incentive) || 0);
    const ot = Math.max(0, Number(form.overtime) || 0);
    const bon = Math.max(0, Number(form.bonus) || 0);
    const gross = basic + inc + ot + bon;

    const leave = Math.max(0, Number(form.leaveDeduction) || 0);
    const deductions = leave;

    const net = Math.max(0, gross - deductions);

    return {
      gross,
      deductions,
      net,
    };
  }, [form.basicSalary, form.incentive, form.overtime, form.bonus, form.leaveDeduction]);

  // Load eligible employees once
  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await payrollPortalApi.employees();
      setEmployees(res.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load school employees'), 'error');
    } finally {
      setLoadingEmployees(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Load payrolls list
  const loadPayrolls = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await payrollPortalApi.list({
        page: targetPage,
        limit: 5,
        month: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setPayrolls(res.data || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) setPagination(res.pagination);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load payroll logs'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, selectedMonth, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    loadPayrolls(page);
  }, [page, selectedMonth, statusFilter, searchQuery]);

  // When Employee is selected in dropdown -> Auto-fetch & prefill details
  const handleEmployeeChange = (employeeRefId) => {
    const emp = employees.find((e) => e.id === employeeRefId);
    if (!emp) {
      setForm((prev) => ({
        ...prev,
        employeeRefId: '',
        employeeType: 'STAFF',
        employeeId: '',
        employeeName: '',
        employeeEmail: '',
        employeeRole: '',
        department: '',
        designation: '',
        basicSalary: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      employeeRefId: emp.id,
      employeeType: emp.type,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      employeeEmail: emp.email,
      employeeRole: emp.role,
      department: emp.department,
      designation: emp.designation,
      basicSalary: String(emp.basicSalary || 0),
      incentive: '',
      overtime: '',
      bonus: '',
      leaveDeduction: '',
      remarks: '',
    }));
  };

  const handleOpenCreateModal = () => {
    const firstEmp = employees[0];
    if (firstEmp) {
      setForm({
        employeeRefId: firstEmp.id,
        employeeType: firstEmp.type,
        employeeId: firstEmp.employeeId,
        employeeName: firstEmp.name,
        employeeEmail: firstEmp.email,
        employeeRole: firstEmp.role,
        department: firstEmp.department,
        designation: firstEmp.designation,
        payrollMonth: selectedMonth !== 'ALL' ? selectedMonth : defaultMonth,
        payrollDate: getTodayISODate(),
        basicSalary: String(firstEmp.basicSalary || 0),
        incentive: '',
        overtime: '',
        bonus: '',
        leaveDeduction: '',
        paymentStatus: 'PROCESSED',
        paymentMethod: 'BANK_TRANSFER',
        remarks: '',
      });
    } else {
      setForm({
        employeeRefId: '',
        employeeType: 'STAFF',
        employeeId: '',
        employeeName: '',
        employeeEmail: '',
        employeeRole: '',
        department: '',
        designation: '',
        payrollMonth: selectedMonth !== 'ALL' ? selectedMonth : defaultMonth,
        payrollDate: getTodayISODate(),
        basicSalary: '',
        incentive: '',
        overtime: '',
        bonus: '',
        leaveDeduction: '',
        paymentStatus: 'PROCESSED',
        paymentMethod: 'BANK_TRANSFER',
        remarks: '',
      });
    }
    setCreateModalOpen(true);
  };

  const handleCreatePayrollSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeRefId) {
      showToast('Please select an employee', 'error');
      return;
    }
    if (!form.basicSalary || Number(form.basicSalary) <= 0) {
      showToast('Please specify a valid basic salary', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeRefId: form.employeeRefId,
        employeeType: form.employeeType,
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        employeeEmail: form.employeeEmail,
        employeeRole: form.employeeRole,
        department: form.department,
        designation: form.designation,
        payrollMonth: form.payrollMonth,
        payrollDate: form.payrollDate,
        basicSalary: Number(form.basicSalary) || 0,
        allowances: 0,
        incentive: Number(form.incentive) || 0,
        overtime: Number(form.overtime) || 0,
        bonus: Number(form.bonus) || 0,
        leaveDeduction: Number(form.leaveDeduction) || 0,
        otherDeduction: 0,
        advanceLoanDeduction: 0,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        remarks: form.remarks,
      };

      const res = await payrollPortalApi.create(payload);
      showToast(res.message || 'Payroll created successfully', 'success');
      setCreateModalOpen(false);
      loadPayrolls(1);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to create payroll'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (payroll) => {
    const nextStatus = payroll.paymentStatus === 'PAID' ? 'PROCESSED' : 'PAID';
    try {
      await payrollPortalApi.updateStatus(payroll.id, nextStatus);
      showToast(`Payroll marked as ${nextStatus}`, 'success');
      loadPayrolls(page);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to update payroll status'), 'error');
    }
  };

  const handleReleaseAll = async () => {
    if (!window.confirm(`Release and mark all processed payrolls for ${selectedMonth} as PAID?`)) {
      return;
    }
    setReleasing(true);
    try {
      const res = await payrollPortalApi.releaseAll(selectedMonth !== 'ALL' ? selectedMonth : undefined);
      showToast(res.message || 'Salaries released successfully', 'success');
      loadPayrolls(1);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to release salaries'), 'error');
    } finally {
      setReleasing(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await payrollPortalApi.delete(deleteTarget.id);
      showToast('Payroll record deleted', 'success');
      setDeleteTarget(null);
      loadPayrolls(page);
    } catch (error) {
      showToast(apiMessage(error, 'Failed to delete payroll record'), 'error');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="HR & Payroll Management"
        subtitle="Manage employee salary structures, process monthly payrolls, auto-calculate net pay, and generate payslips."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleReleaseAll}
              disabled={releasing || stats.processedCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              title="Mark all processed records as Paid"
            >
              {releasing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              <span>Release Month Salaries</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Create Payroll
            </button>
          </div>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Monthly Net Payroll</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(stats.totalExpense)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Salaries Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600">{stats.paidCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Processed / Ready</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-600">{stats.processedCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Staff / Faculty</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600">{employees.length}</p>
        </div>
      </div>

      {/* Month & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search employee name, ID, department..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">All Months</option>
              {MONTH_OPTIONS.map((m) => {
                const optVal = `${m} ${currentYear}`;
                return (
                  <option key={optVal} value={optVal}>
                    {optVal}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="PAID">Paid</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>

          <button
            onClick={() => loadPayrolls(page)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payroll Records Data Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : payrolls.length === 0 ? (
          <div className="py-16 text-center">
            <Banknote className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">No Payroll Logs Found</h3>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : `No payroll generated for ${selectedMonth}. Click "Create Payroll" to start.`}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Create First Payroll
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-3 py-3 font-bold">Role & Dept</th>
                  <th className="px-3 py-3 font-bold">Payroll Month</th>
                  <th className="px-3 py-3 font-bold">Gross Earnings</th>
                  <th className="px-3 py-3 font-bold">Deductions</th>
                  <th className="px-3 py-3 font-bold">Net Salary</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrolls.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{p.employeeName}</span>
                          <span className="block font-mono text-[11px] text-slate-400">{p.employeeId}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <Badge variant="primary" className="mb-0.5 text-[10px]">
                          {p.employeeRole}
                        </Badge>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.department || '—'}</p>
                      </td>

                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.payrollMonth}</span>
                        <span className="block text-[10px] text-slate-400">
                          {p.payrollDate ? new Date(p.payrollDate).toLocaleDateString() : '—'}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(p.grossEarnings)}
                      </td>

                      <td className="px-3 py-3 font-semibold text-rose-500">
                        {p.totalDeductions > 0 ? `-${formatCurrency(p.totalDeductions)}` : '₹0'}
                      </td>

                      <td className="px-3 py-3">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.netSalary)}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            p.paymentStatus === 'PAID'
                              ? 'success'
                              : p.paymentStatus === 'PROCESSED'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {p.paymentStatus}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPay(p);
                              setPayslipModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                            title="View Payslip Statement"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Payslip</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`rounded-lg p-1.5 transition ${
                              p.paymentStatus === 'PAID'
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={p.paymentStatus === 'PAID' ? 'Mark as Processed' : 'Mark as Paid'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            title="Delete Payroll Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && payrolls.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total || 0)}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.total || 0)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total || 0}</span> payroll logs
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                        p === pagination.page
                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE PAYROLL MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Employee Monthly Payroll"
        size="xl"
      >
        <form onSubmit={handleCreatePayrollSubmit} className="space-y-5">
          {/* Top Row: Employee, Month, Date */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Employee *
              </label>
              <select
                value={form.employeeRefId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId} - {emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Payroll Month
              </label>
              <select
                value={form.payrollMonth}
                onChange={(e) => setForm({ ...form, payrollMonth: e.target.value })}
                required
                className={inputClass}
              >
                {MONTH_OPTIONS.map((m) => {
                  const optVal = `${m} ${currentYear}`;
                  return (
                    <option key={optVal} value={optVal}>
                      {optVal}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Payroll Date
              </label>
              <input
                type="date"
                value={form.payrollDate}
                onChange={(e) => setForm({ ...form, payrollDate: e.target.value })}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* 2-Column Box: Earnings & Deductions */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Left: Earnings */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <h4 className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <span>1. Earnings (Credit)</span>
                <span className="text-[11px] font-bold">{formatCurrency(calculation.gross)}</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>Basic Salary *</span>
                    <span className="text-[10px] text-slate-400">(Auto-fetched)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={form.basicSalary}
                      onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                      placeholder="e.g. 25000"
                      required
                      className={`${inputClass} pl-7 font-bold text-slate-800 dark:text-white`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Incentive
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={form.incentive}
                        onChange={(e) => setForm({ ...form, incentive: e.target.value })}
                        placeholder="0"
                        className={`${inputClass} pl-6`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Overtime
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={form.overtime}
                        onChange={(e) => setForm({ ...form, overtime: e.target.value })}
                        placeholder="0"
                        className={`${inputClass} pl-6`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Bonus
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={form.bonus}
                        onChange={(e) => setForm({ ...form, bonus: e.target.value })}
                        placeholder="0"
                        className={`${inputClass} pl-6`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Deductions */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
              <h4 className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                <span>2. Deductions (Debit)</span>
                <span className="text-[11px] font-bold">-{formatCurrency(calculation.deductions)}</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span>Leave / Absent Deduction</span>
                    <span className="text-[10px] text-slate-400">(Auto-calculated / Editable)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={form.leaveDeduction}
                      onChange={(e) => setForm({ ...form, leaveDeduction: e.target.value })}
                      placeholder="0"
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Payment Method & Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className={inputClass}
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                      <option value="UPI">UPI / Net Banking</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                    <select
                      value={form.paymentStatus}
                      onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                      className={inputClass}
                    >
                      <option value="PROCESSED">Processed (Pending Release)</option>
                      <option value="PAID">Mark as Paid</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Summary Banner */}
          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-50/50 to-primary/5 p-4 sm:flex-row dark:border-primary/30 dark:bg-slate-900">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Net Take-Home Salary
              </span>
              <p className="text-2xl font-black text-primary dark:text-white">
                {formatCurrency(calculation.net)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Gross: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(calculation.gross)}</strong></span>
              <span>•</span>
              <span>Deductions: <strong className="text-rose-500">-{formatCurrency(calculation.deductions)}</strong></span>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Regular monthly payroll with performance bonus"
              className={inputClass}
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.employeeRefId}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
              <span>{saving ? 'Creating Payroll...' : 'Create Payroll'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PAYSLIP MODAL */}
      {selectedPay && (
        <Modal
          isOpen={payslipModalOpen}
          onClose={() => setPayslipModalOpen(false)}
          title={`Salary Payslip: ${selectedPay.employeeName}`}
          size="lg"
        >
          <div className="space-y-6">
            <div id="printable-payslip" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              {/* Header */}
              <div className="border-b border-dashed border-slate-200 pb-4 text-center dark:border-slate-800">
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {schoolName}
                </h3>
                <p className="text-xs font-bold text-primary tracking-wide">MONTHLY SALARY PAYSLIP STATEMENT</p>
                <p className="text-[11px] font-semibold text-slate-400">Payroll Period: {selectedPay.payrollMonth}</p>
              </div>

              {/* Employee Info Grid */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-b border-dashed border-slate-200 pb-4 text-xs dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Employee Name</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedPay.employeeName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Employee ID</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedPay.employeeId}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Designation / Role</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedPay.designation || selectedPay.employeeRole} ({selectedPay.employeeRole})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Department</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{selectedPay.department || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Payment Status</span>
                  <div>
                    <Badge variant={selectedPay.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                      {selectedPay.paymentStatus}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Payment Mode</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{selectedPay.paymentMethod}</p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div>
                  <h5 className="border-b border-slate-200 pb-1 font-bold text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
                    Earnings Breakdown
                  </h5>
                  <div className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-semibold">{formatCurrency(selectedPay.basicSalary)}</span>
                    </div>
                    {selectedPay.allowances > 0 && (
                      <div className="flex justify-between">
                        <span>Allowances</span>
                        <span className="font-semibold">{formatCurrency(selectedPay.allowances)}</span>
                      </div>
                    )}
                    {selectedPay.incentive > 0 && (
                      <div className="flex justify-between">
                        <span>Incentive</span>
                        <span className="font-semibold">{formatCurrency(selectedPay.incentive)}</span>
                      </div>
                    )}
                    {selectedPay.overtime > 0 && (
                      <div className="flex justify-between">
                        <span>Overtime</span>
                        <span className="font-semibold">{formatCurrency(selectedPay.overtime)}</span>
                      </div>
                    )}
                    {selectedPay.bonus > 0 && (
                      <div className="flex justify-between">
                        <span>Bonus</span>
                        <span className="font-semibold">{formatCurrency(selectedPay.bonus)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
                      <span>Gross Earnings</span>
                      <span>{formatCurrency(selectedPay.grossEarnings)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h5 className="border-b border-slate-200 pb-1 font-bold text-rose-700 dark:border-slate-800 dark:text-rose-400">
                    Deductions Breakdown
                  </h5>
                  <div className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span>Leave / Absent Deduction</span>
                      <span className="font-semibold">
                        {selectedPay.leaveDeduction > 0 ? `-${formatCurrency(selectedPay.leaveDeduction)}` : '₹0'}
                      </span>
                    </div>
                    {selectedPay.otherDeduction > 0 && (
                      <div className="flex justify-between">
                        <span>Other Deduction</span>
                        <span className="font-semibold">-{formatCurrency(selectedPay.otherDeduction)}</span>
                      </div>
                    )}
                    {selectedPay.advanceLoanDeduction > 0 && (
                      <div className="flex justify-between">
                        <span>Advance / Loan</span>
                        <span className="font-semibold">-{formatCurrency(selectedPay.advanceLoanDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-rose-600 dark:border-slate-800">
                      <span>Total Deductions</span>
                      <span>-{formatCurrency(selectedPay.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Box */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-3.5 text-xs font-bold dark:bg-slate-900">
                <span className="text-slate-700 dark:text-slate-200">Net Take-Home Salary</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedPay.netSalary)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayslipModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const printContent = document.getElementById('printable-payslip');
                  if (!printContent) {
                    window.print();
                    return;
                  }
                  const printWin = window.open('', '_blank');
                  printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Payslip - ${selectedPay?.employeeName} (${selectedPay?.payrollMonth})</title>
                        <style>
                          @page { size: A4 portrait; margin: 15mm; }
                          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #0f172a; margin: 0; }
                          .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 18px; }
                          .school-title { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; letter-spacing: 0.5px; }
                          .sub-title { font-size: 13px; font-weight: 800; color: #4f46e5; margin: 4px 0; letter-spacing: 0.5px; }
                          .month-badge { font-size: 12px; font-weight: 600; color: #64748b; margin: 0; }
                          .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 18px; }
                          .info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
                          .info-val { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0; }
                          .salary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
                          .card-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
                          .card-head { font-size: 12px; font-weight: 900; text-transform: uppercase; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; }
                          .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
                          .row.total { font-weight: 800; font-size: 13px; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px; }
                          .net-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
                          .net-title { font-size: 14px; font-weight: 800; color: #166534; }
                          .net-amount { font-size: 20px; font-weight: 900; color: #15803d; }
                          .signature-area { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
                          .sign-block { width: 180px; text-align: center; border-top: 1.5px solid #64748b; padding-top: 6px; font-size: 11px; font-weight: 700; color: #334155; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1 class="school-title">${schoolName}</h1>
                          <div class="sub-title">SALARY PAYSLIP STATEMENT</div>
                          <p class="month-badge">Payroll Period: ${selectedPay?.payrollMonth}</p>
                        </div>

                        <div class="grid-info">
                          <div>
                            <div class="info-label">Employee Name</div>
                            <div class="info-val">${selectedPay?.employeeName}</div>
                          </div>
                          <div>
                            <div class="info-label">Employee ID</div>
                            <div class="info-val">${selectedPay?.employeeId}</div>
                          </div>
                          <div>
                            <div class="info-label">Designation / Role</div>
                            <div class="info-val">${selectedPay?.designation || selectedPay?.employeeRole} (${selectedPay?.employeeRole})</div>
                          </div>
                          <div>
                            <div class="info-label">Department</div>
                            <div class="info-val">${selectedPay?.department || '—'}</div>
                          </div>
                          <div>
                            <div class="info-label">Payment Status</div>
                            <div class="info-val">${selectedPay?.paymentStatus}</div>
                          </div>
                          <div>
                            <div class="info-label">Payment Mode</div>
                            <div class="info-val">${selectedPay?.paymentMethod}</div>
                          </div>
                        </div>

                        <div class="salary-grid">
                          <div class="card-box">
                            <div class="card-head" style="color: #047857;">1. Earnings (Credit)</div>
                            <div class="row"><span>Basic Salary</span><span>${formatCurrency(selectedPay?.basicSalary)}</span></div>
                            ${selectedPay?.incentive > 0 ? `<div class="row"><span>Incentive</span><span>${formatCurrency(selectedPay?.incentive)}</span></div>` : ''}
                            ${selectedPay?.overtime > 0 ? `<div class="row"><span>Overtime</span><span>${formatCurrency(selectedPay?.overtime)}</span></div>` : ''}
                            ${selectedPay?.bonus > 0 ? `<div class="row"><span>Bonus</span><span>${formatCurrency(selectedPay?.bonus)}</span></div>` : ''}
                            <div class="row total"><span>Gross Earnings</span><span>${formatCurrency(selectedPay?.grossEarnings)}</span></div>
                          </div>

                          <div class="card-box">
                            <div class="card-head" style="color: #be123c;">2. Deductions (Debit)</div>
                            <div class="row"><span>Leave / Absent Deduction</span><span>${selectedPay?.leaveDeduction > 0 ? `-${formatCurrency(selectedPay?.leaveDeduction)}` : '₹0'}</span></div>
                            <div class="row total" style="color: #be123c;"><span>Total Deductions</span><span>-${formatCurrency(selectedPay?.totalDeductions)}</span></div>
                          </div>
                        </div>

                        <div class="net-box">
                          <div class="net-title">Net Take-Home Salary:</div>
                          <div class="net-amount">${formatCurrency(selectedPay?.netSalary)}</div>
                        </div>

                        <div class="signature-area">
                          <div class="sign-block">Employee Signature</div>
                          <div class="sign-block">Accounts / Principal Signatory</div>
                        </div>
                      </body>
                    </html>
                  `);
                  printWin.document.close();
                  printWin.focus();
                  printWin.print();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Printer className="h-3.5 w-3.5" /> Print Statement
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Payroll Entry"
        message={`Are you sure you want to delete the payroll record for "${deleteTarget?.employeeName}" (${deleteTarget?.payrollMonth})?`}
        confirmLabel="Delete Payroll"
        onConfirm={handleDeleteSubmit}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default HRAndPayroll;
