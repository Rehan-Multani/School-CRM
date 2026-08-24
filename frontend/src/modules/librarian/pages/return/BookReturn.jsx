import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ReturnReceipt } from '../../components/ui/ReturnReceipt';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Undo, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';

export const BookReturn = () => {
  const toast = useToast();

  const [loans, setLoans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [condition, setCondition] = useState('GOOD');
  const [fineAmount, setFineAmount] = useState(0);
  const [fineStatus, setFineStatus] = useState('PAID');
  const [remarks, setRemarks] = useState('');

  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const fetchActiveLoans = async () => {
    setLoading(true);
    try {
      const [issuesRes, settingsRes] = await Promise.allSettled([
        librarianApi.issues({ status: 'ISSUED' }),
        librarianApi.settings(),
      ]);

      if (issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value?.data)) {
        setLoans(issuesRes.value.data);
      } else {
        setLoans([]);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettings(settingsRes.value.data);
      }
    } catch {
      toast.error('Failed to load active loan records');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const handleProcessReturn = (loan) => {
    setSelectedLoan(loan);
    setCondition('GOOD');
    setRemarks('');

    // Calculate fine based on settings
    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    const graceDays = settings?.gracePeriodDays || 0;
    const effectiveDueDate = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

    if (now > effectiveDueDate) {
      const diffTime = Math.max(0, now - dueDate);
      const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const finePerDay = settings?.finePerDay ?? 5;
      const maxFine = settings?.maxFineAmount ?? 500;
      const calculated = Math.min(overdueDays * finePerDay, maxFine);
      setFineAmount(calculated);
      setFineStatus('PAID');
    } else {
      setFineAmount(0);
      setFineStatus('NONE');
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;
    setActionLoading(true);

    try {
      const res = await librarianApi.returnBook(selectedLoan.id, {
        returnDate: new Date(),
        fineAmount: Number(fineAmount) || 0,
        fineStatus: fineAmount > 0 ? fineStatus : 'NONE',
        conditionOnReturn: condition,
        remarks,
      });

      toast.success(`Book "${selectedLoan.bookTitle}" returned to circulation shelf!`);

      setCreatedReceipt({
        ...res.data,
        bookTitle: selectedLoan.bookTitle,
        borrowerName: selectedLoan.borrowerName,
        borrowerType: selectedLoan.borrowerType,
        borrowerCode: selectedLoan.borrowerCode,
        accessionNumber: selectedLoan.accessionNumber,
        issueDate: selectedLoan.issueDate,
        dueDate: selectedLoan.dueDate,
        returnDate: new Date().toISOString(),
        fineAmount,
        condition,
      });

      setSelectedLoan(null);
      setReceiptOpen(true);
      fetchActiveLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to process return');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Book Title',
      key: 'bookTitle',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val}</span>
          <span className="text-3xs text-slate-400">Copy: {row.accessionNumber || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: 'Borrower',
      key: 'borrowerName',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val}</span>
          <span className="text-3xs text-slate-400">{row.borrowerType} • {row.borrowerCode || 'STU'}</span>
        </div>
      ),
    },
    { title: 'Issue Date', key: 'issueDate', render: (val) => formatDate(val) },
    {
      title: 'Due Date',
      key: 'dueDate',
      sortable: true,
      render: (val) => {
        const isLate = new Date(val) < new Date();
        return (
          <span className={`font-bold text-xs ${isLate ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
            {formatDate(val)}
          </span>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (val, row) => {
        const isOverdue = new Date(row.dueDate) < new Date();
        return (
          <Badge variant={isOverdue ? 'danger' : 'warning'}>
            {isOverdue ? `Overdue (${row.overdueDays || 1}d)` : 'Active'}
          </Badge>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <button
          onClick={() => handleProcessReturn(row)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Undo className="h-3.5 w-3.5" />
          <span>Return Book</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Return Book"
        subtitle="Process return of actively loaned library copies, assess physical condition, and collect overdue fines."
        actions={
          <button
            onClick={fetchActiveLoans}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : loans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Active Book Loans</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All issued library copies have been returned to their respective shelves.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={loans}
            searchPlaceholder="Search by book title, borrower, or accession code..."
            searchKeys={['bookTitle', 'borrowerName', 'accessionNumber', 'borrowerCode']}
            csvFilename="active_book_loans.csv"
          />
        </div>
      )}

      {/* Return Process Modal */}
      <Modal
        isOpen={Boolean(selectedLoan)}
        onClose={() => setSelectedLoan(null)}
        title="Process Book Return"
        size="md"
      >
        {selectedLoan && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider">Book Title</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedLoan.bookTitle}</p>
                  <p className="text-3xs text-slate-500">Accession Copy: {selectedLoan.accessionNumber || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider">Borrower</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedLoan.borrowerName}</p>
                  <p className="text-3xs text-slate-500">{selectedLoan.borrowerType}</p>
                </div>
              </div>
            </div>

            {/* Condition on Return */}
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Physical Condition Upon Return</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="GOOD">Good / Normal Wear</option>
                <option value="DAMAGED">Damaged (Requires Repair / Penalty)</option>
                <option value="LOST">Lost by Borrower</option>
              </select>
            </div>

            {/* Overdue Fine Calculation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 uppercase">Fine Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 uppercase">Fine Payment Status</label>
                <select
                  value={fineStatus}
                  onChange={(e) => setFineStatus(e.target.value)}
                  disabled={fineAmount <= 0}
                  className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="PAID">Collected / Paid Now</option>
                  <option value="PENDING">Pending (Add to Student Account)</option>
                  <option value="WAIVED">Waived by Librarian</option>
                  <option value="NONE">No Fine</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Remarks / Notes</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Returned on time, pages clean"
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return Receipt Modal */}
      {createdReceipt && (
        <Modal
          isOpen={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          title="Return Acknowledgment Receipt"
          size="md"
        >
          <ReturnReceipt
            returnRecord={createdReceipt}
            onClose={() => setReceiptOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};
export default BookReturn;
