import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SalarySlip } from '../../components/ui/SalarySlip';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  BadgeCent,
  Plus,
  CheckCircle2,
  Eye,
  RefreshCw,
  Printer,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Send,
  Search,
  Check,
  AlertCircle,
  Building,
  Trash2,
  FileText,
  User,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [stats, setStats] = useState({ totalExpense: 0, totalGross: 0, totalDeductions: 0, paidCount: 0, processedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );

  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDisburseAllConfirm, setShowDisburseAllConfirm] = useState(false);
  const [deletePayrollId, setDeletePayrollId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Payroll Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [payrollMonth, setPayrollMonth] = useState(
    new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [incentive, setIncentive] = useState(0);
  const [overtime, setOvertime] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [leaveDeduction, setLeaveDeduction] = useState(0);
  const [advanceLoanDeduction, setAdvanceLoanDeduction] = useState(0);
  const [otherDeduction, setOtherDeduction] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('PROCESSED');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, empRes] = await Promise.all([
        hrApi.payrolls({
          month: selectedMonth !== 'ALL' ? selectedMonth : undefined,
          status: activeTab !== 'ALL' ? activeTab : undefined,
          limit: 300,
        }),
        hrApi.payrollEmployees(),
      ]);
      if (payRes?.success) {
        setPayrolls(payRes.data || []);
        if (payRes.stats) setStats(payRes.stats);
      }
      if (empRes?.success) {
        setEligibleEmployees(empRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectEmployee = (empId) => {
    setSelectedEmpId(empId);
    const emp = eligibleEmployees.find((e) => e.id === empId);
    if (emp) {
      setBasicSalary(emp.basicSalary || 35000);
      setAllowances(emp.allowances || 0);
      setLeaveDeduction(emp.calculatedLeaveDeductions || 0);
    }
  };

  const grossEarnings =
    Number(basicSalary || 0) +
    Number(allowances || 0) +
    Number(incentive || 0) +
    Number(overtime || 0) +
    Number(bonus || 0);

  const totalDeductions =
    Number(leaveDeduction || 0) +
    Number(advanceLoanDeduction || 0) +
    Number(otherDeduction || 0);

  const netPayable = Math.max(0, grossEarnings - totalDeductions);

  const handleCreatePayroll = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast('Please select an employee', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const emp = eligibleEmployees.find((e) => e.id === selectedEmpId);
      const payload = {
        employeeRefId: selectedEmpId,
        employeeType: emp?.employeeType || 'STAFF',
        employeeId: emp?.employeeId || 'EMP',
        employeeName: emp?.name || 'Staff',
        department: emp?.department || 'General',
        designation: emp?.designation || 'Staff',
        month: payrollMonth,
        basicSalary: Number(basicSalary),
        allowances: Number(allowances),
        incentive: Number(incentive),
        overtime: Number(overtime),
        bonus: Number(bonus),
        leaveDeduction: Number(leaveDeduction),
        advanceLoanDeduction: Number(advanceLoanDeduction),
        otherDeduction: Number(otherDeduction),
        paymentStatus,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        remarks: remarks.trim(),
      };

      await hrApi.createPayroll(payload);
      showToast(`Payroll calculated for ${emp?.name}!`, 'success');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create payroll', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburseSingle = async (payrollId) => {
    try {
      await hrApi.disbursePayroll(payrollId, {
        paymentStatus: 'PAID',
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: new Date().toISOString(),
      });
      showToast('Salary disbursed and marked as PAID!', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Disbursement failed', 'error');
    }
  };

  const handleDisburseAll = async () => {
    try {
      const pendingIds = payrolls.filter((p) => p.paymentStatus !== 'PAID').map((p) => p.id);
      if (pendingIds.length === 0) {
        showToast('All records for this month are already PAID.', 'info');
        setShowDisburseAllConfirm(false);
        return;
      }

      await hrApi.disburseAllPayroll({
        month: selectedMonth,
        payrollIds: pendingIds,
        paymentMethod: 'BANK_TRANSFER',
      });

      showToast(`Successfully disbursed all ${pendingIds.length} payrolls!`, 'success');
      setShowDisburseAllConfirm(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to disburse all', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletePayrollId) return;
    try {
      await hrApi.deletePayroll(deletePayrollId);
      showToast('Payroll record removed.', 'info');
      setDeletePayrollId(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete payroll', 'error');
    }
  };

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        (p.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.department || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [payrolls, searchTerm]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Faculty & Staff Compensation & Payroll"
        subtitle="Process monthly salaries, calculate statutory deductions, generate official tax slips, and disburse bank transfers."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {payrolls.some((p) => p.paymentStatus !== 'PAID') && (
              <button
                onClick={() => setShowDisburseAllConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disburse All Salaries</span>
              </button>
            )}

            <button
              onClick={() => {
                setSelectedEmpId(eligibleEmployees[0]?.id || '');
                handleSelectEmployee(eligibleEmployees[0]?.id || '');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Payslip</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Net Disbursed</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{Number(stats.totalExpense || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Net bank payout</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <BadgeCent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Remuneration</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ₹{Number(stats.totalGross || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Before deductions</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Deductions</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              ₹{Number(stats.totalDeductions || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Leaves & advances</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600 dark:text-rose-400">
            <TrendingUp className="w-5 h-5 rotate-180" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Disbursement Rate</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.paidCount || 0} / {(stats.paidCount || 0) + (stats.processedCount || 0)} Paid
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats.processedCount || 0} awaiting release</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Month Selector, Search & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer outline-none"
          >
            <option value="ALL">All Payroll Cycles</option>
            {[
              'January 2026', 'February 2026', 'March 2026', 'April 2026',
              'May 2026', 'June 2026', 'July 2026', 'August 2026',
              'September 2026', 'October 2026', 'November 2026', 'December 2026'
            ].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PROCESSED', label: 'Processed' },
              { id: 'PAID', label: 'Paid' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Main Payroll Table */}
      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : filteredPayrolls.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
          <BadgeCent className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No payroll records found</h4>
          <p className="text-xs max-w-sm mx-auto">No payroll calculations exist for the selected month and filter.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Staff Personnel</th>
                  <th className="p-4">Payroll Cycle</th>
                  <th className="p-4">Gross Earnings</th>
                  <th className="p-4">Deductions</th>
                  <th className="p-4">Net Salary Payable</th>
                  <th className="p-4">Disbursement Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredPayrolls.map((p) => {
                  const isPaid = p.paymentStatus === 'PAID';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                            {p.employeeName?.[0] || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{p.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.employeeId} • {p.department || 'General'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium">
                        {p.month}
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-800 dark:text-slate-200">
                        ₹{Number(p.grossSalary || p.basicSalary || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-4 whitespace-nowrap text-rose-600 dark:text-rose-400 font-bold">
                        -₹{Number(p.totalDeduction || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          ₹{Number(p.netSalary || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <Badge variant={isPaid ? 'success' : 'warning'}>
                          {isPaid ? 'DISBURSED (PAID)' : 'PROCESSED'}
                        </Badge>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSlip(p)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer"
                            title="View Salary Slip"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Slip</span>
                          </button>

                          {!isPaid && (
                            <button
                              onClick={() => handleDisburseSingle(p.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs"
                            >
                              Disburse
                            </button>
                          )}

                          <button
                            onClick={() => setDeletePayrollId(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing <strong>{filteredPayrolls.length}</strong> calculated compensation vouchers
            </span>
            <span>Payroll Roster Live</span>
          </div>
        </div>
      )}

      {/* Create Payslip Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Compute Monthly Compensation Voucher"
        size="lg"
      >
        <form onSubmit={handleCreatePayroll} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Faculty / Staff Member <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                {eligibleEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeId || 'EMP'}) — Base: ₹{Number(e.basicSalary || 35000).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Remuneration Month Cycle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                placeholder="e.g. August 2026"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* Earnings Grid */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Earnings Breakdown (₹)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Basic Base Pay</label>
                <input
                  type="number"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Allowances (HRA/DA)</label>
                <input
                  type="number"
                  value={allowances}
                  onChange={(e) => setAllowances(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Incentive / Bonus</label>
                <input
                  type="number"
                  value={incentive}
                  onChange={(e) => setIncentive(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Overtime Pay</label>
                <input
                  type="number"
                  value={overtime}
                  onChange={(e) => setOvertime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Deductions Grid */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 space-y-3">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Deductions Breakdown (₹)</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Unpaid Leave Cut</label>
                <input
                  type="number"
                  value={leaveDeduction}
                  onChange={(e) => setLeaveDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs text-rose-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Loan / Advance Recovery</label>
                <input
                  type="number"
                  value={advanceLoanDeduction}
                  onChange={(e) => setAdvanceLoanDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs text-rose-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Other Tax / Statutory</label>
                <input
                  type="number"
                  value={otherDeduction}
                  onChange={(e) => setOtherDeduction(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-bold text-xs text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Net Calculation Summary */}
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">Net Take-Home Pay</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Gross (₹{grossEarnings.toLocaleString('en-IN')}) - Deductions (₹{totalDeductions.toLocaleString('en-IN')})</p>
            </div>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">
              ₹{netPayable.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              {submitting ? 'Calculating...' : 'Generate Payslip Voucher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Salary Slip Modal */}
      {selectedSlip && (
        <Modal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          title={`Official Salary Slip — ${selectedSlip.employeeName} (${selectedSlip.month})`}
          size="lg"
        >
          <SalarySlip payroll={selectedSlip} onClose={() => setSelectedSlip(null)} />
        </Modal>
      )}

      {/* Disburse All Confirmation */}
      <ConfirmDialog
        isOpen={showDisburseAllConfirm}
        title="Disburse All Pending Salaries?"
        message={`Are you sure you want to disburse all pending payroll slips for ${selectedMonth}? All vouchers will be marked as PAID with bank transfer records.`}
        confirmLabel="Confirm Bulk Disbursement"
        confirmVariant="success"
        onConfirm={handleDisburseAll}
        onCancel={() => setShowDisburseAllConfirm(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletePayrollId}
        title="Remove Payroll Slip Record?"
        message="Are you sure you want to delete this salary record? This action will remove the voucher from the institutional ledger."
        confirmLabel="Delete Voucher"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletePayrollId(null)}
      />

      <ToastComponent />
    </div>
  );
};

export default PayrollManagement;
