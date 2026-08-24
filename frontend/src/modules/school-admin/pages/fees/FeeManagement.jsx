import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { feePortalApi, schoolPortalApi } from '../../../../shared/api/client';
import { formatCurrency } from '../../utils/formatters';
import { FeeHeadsIndex } from './FeeHeadsIndex';
import { FeeStructuresIndex } from './FeeStructuresIndex';
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  FileText,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const FeeManagement = () => {
  const [activeTab, setActiveTab] = useState('structures');
  const { showToast, ToastComponent } = useToast();
  const { user } = useSchoolAdminAuth();
  const schoolName = user?.schoolName || 'Greenfield Public School';

  // Overall Stats & Counts
  const [structuresCount, setStructuresCount] = useState(0);
  const [headsCount, setHeadsCount] = useState(0);

  // Invoices & Payments State
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Invoice Filters & Search
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');

  // Payment Filters & Search
  const [paymentSearch, setPaymentSearch] = useState('');

  // Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    paymentReference: '',
    remarks: '',
  });

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Generate Invoice Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    studentId: '',
    periodLabel: 'Term 1 / Monthly Tuition',
    dueDate: '',
  });

  const loadSummaryStats = useCallback(async () => {
    try {
      const [strRes, headRes] = await Promise.all([
        feePortalApi.structures({ limit: 100 }).catch(() => ({ data: [] })),
        feePortalApi.heads({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setStructuresCount((strRes.data || []).length);
      setHeadsCount((headRes.data || []).length);
    } catch {
      // ignore
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await feePortalApi.invoices({ limit: 100 });
      setInvoices(res.data || []);
    } catch (err) {
      showToast(err.message || 'Unable to load fee invoices', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  }, [showToast]);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await feePortalApi.payments({ limit: 100 });
      setPayments(res.data || []);
    } catch (err) {
      showToast(err.message || 'Unable to load payment records', 'error');
    } finally {
      setLoadingPayments(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSummaryStats();
    loadInvoices();
    loadPayments();
  }, [loadSummaryStats, loadInvoices, loadPayments]);

  const handleOpenPayModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balanceAmount,
      paymentMethod: 'UPI',
      paymentReference: '',
      remarks: '',
    });
    setPayModalOpen(true);
  };

  const handleOpenGenerateModal = async () => {
    setGenerateModalOpen(true);
    setLoadingStudents(true);
    try {
      const res = await schoolPortalApi.students({ status: 'ACTIVE', limit: 100 });
      setStudents(res.data || []);
      if (res.data?.length > 0) {
        setGenerateForm((prev) => ({ ...prev, studentId: res.data[0].id }));
      }
    } catch (err) {
      showToast(err.message || 'Unable to load students list', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!generateForm.studentId) {
      showToast('Please select a student', 'error');
      return;
    }
    setGenerating(true);
    try {
      await feePortalApi.generateInvoice({
        studentId: generateForm.studentId,
        periodLabel: generateForm.periodLabel,
        dueDate: generateForm.dueDate || undefined,
      });

      showToast('Fee invoice generated successfully!', 'success');
      setGenerateModalOpen(false);
      loadInvoices();
    } catch (err) {
      showToast(err.message || 'Failed to generate fee invoice', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaying(true);
    try {
      const res = await feePortalApi.payInvoice(selectedInvoice.id, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentReference: paymentForm.paymentReference,
        remarks: paymentForm.remarks,
      });
      showToast('Fee payment recorded successfully!', 'success');
      setPayModalOpen(false);
      loadInvoices();
      loadPayments();
      setSelectedPayment(res.data);
      setReceiptModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Payment recording failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  // KPI Calculations
  const invoiceStats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
    const totalPaid = invoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
    const totalPending = invoices.reduce((acc, inv) => acc + (Number(inv.balanceAmount) || 0), 0);
    const paidCount = invoices.filter((i) => i.status === 'PAID').length;
    return {
      totalBilled,
      totalPaid,
      totalPending,
      paidCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  const totalCollectedAmount = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== 'ALL' && inv.status !== invoiceStatusFilter) return false;
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const studentName = `${inv.studentId?.firstName || ''} ${inv.studentId?.lastName || ''}`.toLowerCase();
        const invNum = (inv.invoiceNumber || '').toLowerCase();
        const period = (inv.periodLabel || '').toLowerCase();
        if (!studentName.includes(q) && !invNum.includes(q) && !period.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearch]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const studentName = `${p.studentId?.firstName || ''} ${p.studentId?.lastName || ''}`.toLowerCase();
        const rcNum = (p.receiptNumber || '').toLowerCase();
        const invNum = (p.invoiceId?.invoiceNumber || '').toLowerCase();
        if (!studentName.includes(q) && !rcNum.includes(q) && !invNum.includes(q)) return false;
      }
      return true;
    });
  }, [payments, paymentSearch]);

  return (
    <div className="space-y-6">
      {/* Main Page Header */}
      <PageHeader
        title="Fee & Finance Management"
        subtitle="End-to-end fee system: Configure Fee Heads, Class Structures, Invoices, and Payment Collections."
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Total Class Structures */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Fee Structures</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {structuresCount}
          </p>
          <span className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Class fee configurations
          </span>
        </div>

        {/* Fee Heads Master */}
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Fee Heads Master
            </span>
            <ListChecks className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {headsCount}
          </p>
          <span className="mt-0.5 text-[11px] font-semibold text-indigo-600/80">
            Tuition, Exam, Activity & Bus
          </span>
        </div>

        {/* Invoices Pending Balance */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Pending Balance
            </span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(invoiceStats.totalPending)}
          </p>
          <span className="mt-0.5 text-[11px] font-semibold text-rose-600/80">
            Across {invoices.length} invoices
          </span>
        </div>

        {/* Total Collected */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Total Collected
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalCollectedAmount || invoiceStats.totalPaid)}
          </p>
          <span className="mt-0.5 text-[11px] font-semibold text-emerald-600/80">
            {payments.length} verified receipts
          </span>
        </div>
      </div>

      {/* Modern Tabs Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800">
        {[
          { id: 'structures', label: 'Class Fee Structures', icon: Layers, count: structuresCount },
          { id: 'heads', label: 'Fee Heads Master', icon: ListChecks, count: headsCount },
          { id: 'invoices', label: 'Student Invoices', icon: FileText, count: invoices.length },
          { id: 'payments', label: 'Payment Registry & Receipts', icon: Receipt, count: payments.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                isActive
                  ? 'bg-primary text-white shadow-primary/20'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Class Fee Structures */}
      {activeTab === 'structures' && <FeeStructuresIndex hideHeader={true} />}

      {/* TAB 2: Fee Heads Master */}
      {activeTab === 'heads' && <FeeHeadsIndex hideHeader={true} />}

      {/* TAB 3: Student Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Search student or invoice #..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-950">
                {[
                  { id: 'ALL', label: 'All Invoices' },
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'PARTIALLY_PAID', label: 'Partial' },
                  { id: 'PAID', label: 'Paid' },
                  { id: 'OVERDUE', label: 'Overdue' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setInvoiceStatusFilter(st.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      invoiceStatusFilter === st.id
                        ? 'bg-white text-primary shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenGenerateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Generate Invoice
              </button>
              <button
                type="button"
                onClick={loadInvoices}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                title="Refresh Invoices"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingInvoices ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          {loadingInvoices ? (
            <SkeletonTable rows={5} columns={6} />
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Student Invoices Found
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Generate student invoices against class fee structures to collect school tuition & fees.
              </p>
              <button
                type="button"
                onClick={handleOpenGenerateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Generate First Invoice
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-bold">Invoice #</th>
                      <th className="px-4 py-3 font-bold">Student Name</th>
                      <th className="px-3 py-3 font-bold">Billing Period</th>
                      <th className="px-3 py-3 font-bold">Total Bill</th>
                      <th className="px-3 py-3 font-bold">Paid Amount</th>
                      <th className="px-3 py-3 font-bold">Remaining Balance</th>
                      <th className="px-3 py-3 font-bold">Due Date</th>
                      <th className="px-3 py-3 text-center font-bold">Status</th>
                      <th className="px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {inv.studentId
                            ? `${inv.studentId.firstName} ${inv.studentId.lastName || ''}`.trim()
                            : 'Student'}
                        </td>
                        <td className="px-3 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                          {inv.periodLabel}
                        </td>
                        <td className="px-3 py-3.5 font-bold text-slate-900 dark:text-white">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="px-3 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="px-3 py-3.5 font-bold text-rose-600">
                          {formatCurrency(inv.balanceAmount)}
                        </td>
                        <td className="px-3 py-3.5 text-slate-500">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <Badge
                            variant={
                              inv.status === 'PAID'
                                ? 'success'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'warning'
                                : inv.status === 'OVERDUE'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {inv.status !== 'PAID' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(inv)}
                              className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
                            >
                              <CreditCard className="h-3 w-3" /> Collect Fee
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Paid in Full
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Payment Registry & Receipts */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Payment Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                placeholder="Search receipt #, invoice #, student..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 text-xs font-semibold outline-none focus:border-primary focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={loadPayments}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingPayments ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Payments Table */}
          {loadingPayments ? (
            <SkeletonTable rows={5} columns={6} />
          ) : filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <h4 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                No Payment Receipts Found
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Payment transactions and printable receipts will appear here once collected against student invoices.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-bold">Receipt #</th>
                      <th className="px-4 py-3 font-bold">Student</th>
                      <th className="px-3 py-3 font-bold">Invoice Ref</th>
                      <th className="px-3 py-3 font-bold">Collected Amount</th>
                      <th className="px-3 py-3 text-center font-bold">Payment Mode</th>
                      <th className="px-3 py-3 font-bold">Collection Date</th>
                      <th className="px-3 py-3 text-center font-bold">Status</th>
                      <th className="px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {p.receiptNumber}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {p.studentId
                            ? `${p.studentId.firstName} ${p.studentId.lastName || ''}`.trim()
                            : '—'}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {p.invoiceId?.invoiceNumber || '—'}
                        </td>
                        <td className="px-3 py-3.5 font-black text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <Badge variant="primary">{p.paymentMethod}</Badge>
                        </td>
                        <td className="px-3 py-3.5 text-slate-500">
                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <Badge variant="success">{p.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayment(p);
                              setReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Collect Fee Payment"
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Invoice #</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Student</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedInvoice.studentId ? `${selectedInvoice.studentId.firstName} ${selectedInvoice.studentId.lastName || ''}`.trim() : '—'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Bill</span>
                  <span className="font-bold">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Remaining Balance</span>
                  <span className="font-bold text-rose-600">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoice.balanceAmount}
                  step="1"
                  className={inputClass}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Payment Method *</label>
                <select
                  className={inputClass}
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash Handover</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="NET_BANKING">Net Banking / NEFT</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Transaction Ref / Cheque # (Optional)</label>
              <input
                type="text"
                placeholder="e.g. UPI-1234567890"
                className={inputClass}
                value={paymentForm.paymentReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Received via GPay from parent"
                className={inputClass}
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
              >
                {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                <span>Confirm Payment Collection</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* GENERATE INVOICE MODAL */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Student Fee Invoice"
      >
        <form onSubmit={handleGenerateInvoice} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Select Student *</label>
            {loadingStudents ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading enrolled students...
              </div>
            ) : (
              <select
                className={inputClass}
                value={generateForm.studentId}
                onChange={(e) => setGenerateForm({ ...generateForm, studentId: e.target.value })}
                required
              >
                <option value="">-- Choose Student --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName || ''} ({st.admissionNumber || st.enrollmentId}) — {st.class?.name || 'Class'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Billing Period / Label *</label>
            <input
              type="text"
              placeholder="e.g. Q1 Tuition (April - June 2026)"
              className={inputClass}
              value={generateForm.periodLabel}
              onChange={(e) => setGenerateForm({ ...generateForm, periodLabel: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Payment Due Date</label>
            <input
              type="date"
              className={inputClass}
              value={generateForm.dueDate}
              onChange={(e) => setGenerateForm({ ...generateForm, dueDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Generate Fee Invoice</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedPayment && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title={`Fee Receipt: ${selectedPayment.receiptNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div id="fee-receipt-print" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-dashed border-slate-200 pb-3 text-center dark:border-slate-800">
                <h4 className="text-base font-black uppercase text-slate-900 dark:text-white">
                  {schoolName}
                </h4>
                <p className="text-xs font-bold text-primary">OFFICIAL FEE PAYMENT RECEIPT</p>
                <p className="font-mono text-xs font-bold text-slate-500 mt-1">{selectedPayment.receiptNumber}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-b border-dashed border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Student Name</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedPayment.studentId ? `${selectedPayment.studentId.firstName} ${selectedPayment.studentId.lastName || ''}`.trim() : 'Student'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Date</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedPayment.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleDateString() : 'Today'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Method</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{selectedPayment.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                  <div><Badge variant="success">PAID</Badge></div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-emerald-50/60 p-4 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Amount Received</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Receipt - ${selectedPayment.receiptNumber}</title>
                        <style>
                          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
                          .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; }
                          .school { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; }
                          .sub { font-size: 12px; font-weight: 700; color: #4f46e5; margin: 4px 0; }
                          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; font-size: 12px; }
                          .amount-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
                          .sign { margin-top: 40px; display: flex; justify-content: flex-end; }
                          .sign-box { text-align: center; border-top: 1px solid #94a3b8; width: 160px; font-size: 11px; font-weight: 700; padding-top: 4px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1 class="school">${schoolName}</h1>
                          <div class="sub">OFFICIAL FEE PAYMENT RECEIPT</div>
                          <div>Receipt #: <strong>${selectedPayment.receiptNumber}</strong></div>
                        </div>
                        <div class="grid">
                          <div><strong>Student:</strong> ${selectedPayment.studentId ? `${selectedPayment.studentId.firstName} ${selectedPayment.studentId.lastName || ''}`.trim() : '—'}</div>
                          <div><strong>Date:</strong> ${selectedPayment.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleDateString() : 'Today'}</div>
                          <div><strong>Method:</strong> ${selectedPayment.paymentMethod}</div>
                          <div><strong>Status:</strong> COMPLETED / PAID</div>
                        </div>
                        <div class="amount-box">
                          <span style="font-weight: 700; color: #166534;">Amount Received:</span>
                          <span style="font-size: 18px; font-weight: 900; color: #15803d;">${formatCurrency(selectedPayment.amount)}</span>
                        </div>
                        <div class="sign">
                          <div class="sign-box">Cashier / Accounts Signatory</div>
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
                <Printer className="h-3.5 w-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};

export default FeeManagement;
