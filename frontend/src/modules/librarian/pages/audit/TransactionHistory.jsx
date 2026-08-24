import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { formatDateTime, formatCurrency } from '../../utils/formatters';
import { History, RefreshCw, RotateCcw, FileCheck, AlertTriangle } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';

export const TransactionHistory = () => {
  const location = useLocation();
  const toast = useToast();

  const getInitialTab = () => {
    if (location.pathname.includes('/returns')) return 'RETURN';
    if (location.pathname.includes('/issues')) return 'ISSUE';
    return 'ALL';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === 'ALL' ? undefined : activeTab;
      const res = await librarianApi.transactions({ type: typeParam, limit: 100 });
      if (res?.success && Array.isArray(res.data)) {
        setTransactions(res.data);
      } else {
        setTransactions([]);
      }
    } catch {
      toast.error('Failed to load transaction audit ledger');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const tabs = [
    { id: 'ALL', label: 'All Transactions' },
    { id: 'ISSUE', label: 'Issue History' },
    { id: 'RETURN', label: 'Return History' },
  ];

  const columns = [
    {
      title: 'Timestamp',
      key: 'performedAt',
      sortable: true,
      render: (val) => formatDateTime(val),
    },
    {
      title: 'Action Type',
      key: 'type',
      sortable: true,
      render: (val) => {
        let variant = 'indigo';
        if (val === 'RETURN') variant = 'success';
        else if (val === 'RENEW') variant = 'neutral';
        else if (val === 'LOST' || val === 'DAMAGED') variant = 'danger';
        return <Badge variant={variant}>{val}</Badge>;
      },
    },
    {
      title: 'Book Title',
      key: 'bookTitle',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val || '—'}</span>
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
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val || '—'}</span>
          <span className="text-3xs text-slate-400">{row.borrowerType} • {row.borrowerCode || 'STU'}</span>
        </div>
      ),
    },
    {
      title: 'Transaction Details',
      key: 'details',
      render: (val) => <span className="text-xs text-slate-600 dark:text-slate-400">{val || '—'}</span>,
    },
    {
      title: 'Fine (if applicable)',
      key: 'fineAmount',
      render: (val) => (val > 0 ? <span className="font-bold text-xs text-rose-600">{formatCurrency(val)}</span> : '—'),
    },
    {
      title: 'Operator',
      key: 'performedBy',
      render: (val) => <span className="text-3xs font-bold text-slate-500 font-mono">{val || 'Librarian'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions Audit Trail"
        subtitle="Immutable transaction ledger capturing all book issues and returns."
        actions={
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : transactions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <History className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Transactions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Circulation actions performed by librarians will be logged here in chronological order.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={transactions}
            searchPlaceholder="Search audit ledger by book, borrower, or operator..."
            searchKeys={['bookTitle', 'borrowerName', 'details', 'performedBy', 'accessionNumber']}
            csvFilename="library_transaction_audit.csv"
          />
        </div>
      )}
    </div>
  );
};
export default TransactionHistory;
