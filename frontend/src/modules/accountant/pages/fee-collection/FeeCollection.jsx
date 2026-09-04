import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { accountantApi } from '../../../../shared/api/client';
import { useAccountantAuth } from '../../context/AccountantAuthContext';
import { Search, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PAYMENT_METHODS = [
  ['CASH', 'Cash (Counter Deposit)'],
  ['UPI', 'UPI (QR / App Transfer)'],
  ['CARD', 'POS Card Swipe'],
  ['NET_BANKING', 'Net Banking NEFT/RTGS'],
  ['CHEQUE', 'Bank Cheque'],
  ['DD', 'Demand Draft (DD)'],
  ['OTHER', 'Other'],
];

const invoiceBadge = (status) =>
  status === 'PAID' ? 'success' : status === 'PARTIALLY_PAID' ? 'info' : status === 'OVERDUE' ? 'danger' : 'warning';

export const FeeCollection = () => {
  const { showToast, ToastComponent } = useToast();
  const { user } = useAccountantAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState(null); // student list item
  const [profile, setProfile] = useState(null); // { student, assignments, invoices }
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [activeInvoice, setActiveInvoice] = useState(null);
  const [form, setForm] = useState({ amount: '', paymentMethod: 'CASH', paymentReference: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [genForm, setGenForm] = useState({ periodLabel: '', dueDate: '' });
  const [generating, setGenerating] = useState(false);

  // debounced student search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      accountantApi
        .searchStudents({ search: query.trim() })
        .then((res) => setResults(res?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadProfile = (student) => {
    setSelected(student);
    setProfile(null);
    setActiveInvoice(null);
    setLoadingProfile(true);
    accountantApi
      .studentFeeProfile(student.id)
      .then((res) => setProfile(res?.data || null))
      .catch((err) => showToast(err?.response?.data?.message || 'Failed to load fee profile', 'error'))
      .finally(() => setLoadingProfile(false));
  };

  const reset = () => {
    setSelected(null);
    setProfile(null);
    setActiveInvoice(null);
    setForm({ amount: '', paymentMethod: 'CASH', paymentReference: '', remarks: '' });
  };

  const openInvoices = useMemo(
    () => (profile?.invoices || []).filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED'),
    [profile]
  );
  const paidInvoices = useMemo(
    () => (profile?.invoices || []).filter((i) => i.status === 'PAID'),
    [profile]
  );

  const startCollect = (invoice) => {
    setActiveInvoice(invoice);
    setForm((f) => ({ ...f, amount: String(invoice.balanceAmount || '') }));
  };

  const submitPayment = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!activeInvoice) return;
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error');
    if (amount > activeInvoice.balanceAmount)
      return showToast(`Amount exceeds balance (${formatCurrency(activeInvoice.balanceAmount)})`, 'error');

    setSubmitting(true);
    accountantApi
      .collectPayment(activeInvoice.id, {
        amount,
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference,
        remarks: form.remarks,
      })
      .then((res) => {
        const data = res?.data;
        showToast(`Payment recorded — receipt ${data?.receiptNumber}`, 'success');
        setReceipt({
          ...data,
          studentName: profile?.student?.name,
          admissionNumber: profile?.student?.admissionNumber,
          invoiceNumber: activeInvoice.invoiceNumber,
          periodLabel: activeInvoice.periodLabel,
        });
        setActiveInvoice(null);
        setForm({ amount: '', paymentMethod: 'CASH', paymentReference: '', remarks: '' });
        loadProfile(selected);
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Payment failed', 'error'))
      .finally(() => setSubmitting(false));
  };

  const submitGenerate = (e) => {
    e.preventDefault();
    const enrollment = selected?.enrollment;
    if (!enrollment?.id || !enrollment?.academicYearId) {
      return showToast('Student has no active enrollment — cannot generate an invoice', 'error');
    }
    if (!genForm.periodLabel.trim()) return showToast('Enter a period label (e.g. "Term 2 2026-27")', 'error');

    setGenerating(true);
    accountantApi
      .generateInvoice({
        studentId: selected.id,
        enrollmentId: enrollment.id,
        academicYearId: enrollment.academicYearId,
        periodLabel: genForm.periodLabel.trim(),
        dueDate: genForm.dueDate || undefined,
      })
      .then(() => {
        showToast('Invoice generated', 'success');
        setGenForm({ periodLabel: '', dueDate: '' });
        loadProfile(selected);
      })
      .catch((err) => showToast(err?.response?.data?.message || 'Could not generate invoice', 'error'))
      .finally(() => setGenerating(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Collection"
        subtitle="Search a student, review assigned fees & invoices, collect a payment and issue an official receipt."
      />

      {!selected && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name or admission number…"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:border-violet-500"
            />
          </div>

          {searching && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </p>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => loadProfile(s)}
                className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-950/50 px-2 rounded-lg"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {s.admissionNumber}
                    {s.enrollment?.class ? ` • ${s.enrollment.class.name}` : ''}
                    {s.enrollment?.section ? ` - ${s.enrollment.section.name}` : ''}
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 text-slate-300" />
              </button>
            ))}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="py-6 text-center text-xs font-semibold text-slate-400">No students found.</p>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="space-y-5">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to search
          </button>

          <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-900/40 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {profile?.student?.name || selected.name}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {profile?.student?.admissionNumber || selected.admissionNumber}
                {selected.enrollment?.class ? ` • ${selected.enrollment.class.name}` : ''}
                {selected.enrollment?.section ? ` - ${selected.enrollment.section.name}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Outstanding</span>
              <span className="text-base font-black text-rose-600">
                {formatCurrency(openInvoices.reduce((s, i) => s + (i.balanceAmount || 0), 0))}
              </span>
            </div>
          </div>

          {loadingProfile ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin inline" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Invoices */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Open Invoices</h4>
                  {openInvoices.length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold py-4">No open invoices for this student.</p>
                  ) : (
                    <div className="space-y-2">
                      {openInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                              <Badge variant={invoiceBadge(inv.status)}>{inv.status}</Badge>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {inv.periodLabel} • due {formatDate(inv.dueDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">
                              Bal {formatCurrency(inv.balanceAmount)} / {formatCurrency(inv.totalAmount)}
                            </p>
                            <button
                              onClick={() => startCollect(inv)}
                              className="mt-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold"
                            >
                              Collect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assigned fee heads */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Assigned Fee Heads</h4>
                  {(profile?.assignments || []).length === 0 ? (
                    <p className="text-xs text-slate-400 font-semibold py-2">No fee assignments.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {profile.assignments.map((a) => (
                          <tr key={a.id}>
                            <td className="py-2 font-semibold text-slate-700 dark:text-slate-300">{a.feeHeadName}</td>
                            <td className="py-2 text-slate-400">{a.frequency}</td>
                            <td className="py-2 text-right font-bold">{formatCurrency(a.finalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {paidInvoices.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Paid Invoices</h4>
                    <div className="space-y-1.5">
                      {paidInvoices.map((inv) => (
                        <div key={inv.id} className="flex justify-between text-[11px] font-semibold">
                          <span className="text-slate-500">{inv.invoiceNumber} • {inv.periodLabel}</span>
                          <span className="text-emerald-600">{formatCurrency(inv.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: collect form / generate invoice */}
              <div className="space-y-4">
                {activeInvoice ? (
                  <form
                    onSubmit={submitPayment}
                    className="bg-white dark:bg-slate-900 border border-violet-300 dark:border-violet-900/50 rounded-2xl p-5 shadow-sm space-y-3"
                  >
                    <h4 className="text-xs font-black uppercase tracking-wider text-violet-600">
                      Collect — {activeInvoice.invoiceNumber}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Balance {formatCurrency(activeInvoice.balanceAmount)}
                    </p>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Amount *
                      <input
                        type="number"
                        required
                        min="1"
                        max={activeInvoice.balanceAmount}
                        value={form.amount}
                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                        className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Payment Method *
                      <select
                        value={form.paymentMethod}
                        onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                        className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        {PAYMENT_METHODS.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Reference / Cheque No
                      <input
                        value={form.paymentReference}
                        onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
                        className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      />
                    </label>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Remarks
                      <input
                        value={form.remarks}
                        onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                        className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      />
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {submitting ? 'Processing…' : `Collect ${formatCurrency(Number(form.amount) || 0)}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveInvoice(null)}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-xs text-slate-400 font-semibold">
                    Select an open invoice to collect a payment.
                  </div>
                )}

                <form
                  onSubmit={submitGenerate}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Generate Invoice
                  </h4>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Period Label *
                    <input
                      value={genForm.periodLabel}
                      onChange={(e) => setGenForm((f) => ({ ...f, periodLabel: e.target.value }))}
                      placeholder="e.g. Term 2 2026-27"
                      className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </label>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Due Date
                    <input
                      type="date"
                      value={genForm.dueDate}
                      onChange={(e) => setGenForm((f) => ({ ...f, dueDate: e.target.value }))}
                      className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={generating}
                    className="w-full h-9 rounded-lg border border-violet-300 dark:border-violet-900/50 text-violet-600 dark:text-violet-400 text-xs font-bold disabled:opacity-50 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                  >
                    {generating ? 'Generating…' : 'Generate from active fee assignments'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {receipt && (
        <PrintReportModal
          isOpen={!!receipt}
          onClose={() => setReceipt(null)}
          title={`Official Fee Receipt — ${receipt.receiptNumber}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">{user?.schoolName || 'School CRM'}</h2>
              <p className="text-xs text-slate-500">Official Fee Payment Receipt</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">Receipt No: {receipt.receiptNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Student Name:</span>
                <span className="font-bold">{receipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Admission No:</span>
                <span className="font-bold">{receipt.admissionNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Invoice:</span>
                <span className="font-bold">{receipt.invoiceNumber} ({receipt.periodLabel})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Date:</span>
                <span className="font-bold">{formatDate(receipt.paymentDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Method:</span>
                <span className="font-bold">{receipt.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Reference:</span>
                <span className="font-bold">{receipt.paymentReference || '—'}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex justify-between items-center text-sm font-black">
              <span>Paid Amount:</span>
              <span className="text-emerald-600">{formatCurrency(receipt.amount)}</span>
            </div>
            <div className="flex justify-between pt-6 text-xs font-bold text-slate-400">
              <span>Issued By: {receipt.collectedBy || user?.name || 'Accountant'}</span>
              <span>Authorized Signature: ________________</span>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};

export default FeeCollection;
