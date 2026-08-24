import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { AlertTriangle, RefreshCw, Undo, Bell } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const OverdueBooks = () => {
  const [overdueList, setOverdueList] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchOverdueBooks = async () => {
    setLoading(true);
    try {
      const [issuesRes, settingsRes] = await Promise.allSettled([
        librarianApi.issues({ status: 'OVERDUE' }),
        librarianApi.settings(),
      ]);

      if (issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value?.data)) {
        setOverdueList(issuesRes.value.data);
      } else {
        setOverdueList([]);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettings(settingsRes.value.data);
      }
    } catch {
      toast.error('Failed to load overdue books');
      setOverdueList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueBooks();
  }, []);

  const [reminding, setReminding] = useState(null);

  const handleSendReminder = async (loan) => {
    setReminding(loan.id);
    try {
      const audience = loan.borrowerType === 'STUDENT' ? 'student' : 'teacher';
      const res = await librarianApi.sendNotification({
        title: 'Overdue Library Book',
        body: `"${loan.bookTitle}" is overdue by ${loan.overdueDays || 1} day(s). Please return it to the library as soon as possible.`,
        audiences: [audience],
        recipientRefIds: loan.borrowerRefId ? [loan.borrowerRefId] : [],
      });
      toast.success(res?.message || `Reminder sent to ${loan.borrowerName}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send reminder');
    } finally {
      setReminding(null);
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
    { title: 'Due Date', key: 'dueDate', sortable: true, render: (val) => formatDate(val) },
    {
      title: 'Days Overdue',
      key: 'overdueDays',
      sortable: true,
      render: (val) => (
        <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-extrabold text-xs rounded-lg inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>{val || 1} Days Late</span>
        </span>
      ),
    },
    {
      title: 'Accrued Fine',
      key: 'fineAmount',
      sortable: true,
      render: (_, row) => {
        const days = row.overdueDays || 1;
        const finePerDay = settings?.finePerDay ?? 5;
        const maxFine = settings?.maxFineAmount ?? 500;
        const estFine = Math.min(days * finePerDay, maxFine);
        return (
          <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
            {formatCurrency(estFine)}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSendReminder(row)}
            disabled={reminding === row.id}
            title="Send Alert Reminder"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Bell className={`h-3.5 w-3.5 ${reminding === row.id ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/librarian/return')}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <Undo className="h-3 w-3" />
            <span>Return</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue Books"
        subtitle="Manage delayed book returns, calculate penalty dues, and send overdue notices to borrowers."
        actions={
          <button
            onClick={fetchOverdueBooks}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : overdueList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">✓</span>
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Overdue Books</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All active library loans are within their scheduled return deadlines.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={overdueList}
            searchPlaceholder="Search overdue loans..."
            searchKeys={['bookTitle', 'borrowerName', 'accessionNumber', 'borrowerCode']}
            csvFilename="overdue_book_loans.csv"
          />
        </div>
      )}
    </div>
  );
};
export default OverdueBooks;
