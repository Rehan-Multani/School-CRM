import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Clock, RefreshCw, BookOpen, User, Undo } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export const IssuedBooks = () => {
  const [issuedList, setIssuedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchIssuedBooks = async () => {
    setLoading(true);
    try {
      const res = await librarianApi.issues({ status: 'ISSUED' });
      if (res?.success && Array.isArray(res.data)) {
        setIssuedList(res.data);
      } else {
        setIssuedList([]);
      }
    } catch {
      toast.error('Failed to load issued books registry');
      setIssuedList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuedBooks();
  }, []);

  const columns = [
    {
      title: 'Book Title',
      key: 'bookTitle',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val}</span>
          <span className="text-3xs text-slate-400">Copy: {row.accessionNumber || 'N/A'} • Code: {row.bookCode || 'N/A'}</span>
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
      title: 'Action',
      key: 'action',
      render: (_, row) => (
        <button
          onClick={() => navigate('/librarian/return')}
          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-3xs font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
        >
          <Undo className="h-3 w-3" />
          <span>Process Return</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issued Books Registry"
        subtitle="Complete live overview of all physical copies currently in circulation with borrowers."
        actions={
          <button
            onClick={fetchIssuedBooks}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : issuedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Clock className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Books Currently Issued</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All registered library copies are currently in the library racks.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={issuedList}
            searchPlaceholder="Search by title, borrower name, or code..."
            searchKeys={['bookTitle', 'borrowerName', 'accessionNumber', 'borrowerCode']}
            csvFilename="issued_books_registry.csv"
          />
        </div>
      )}
    </div>
  );
};
export default IssuedBooks;
