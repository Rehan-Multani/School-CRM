import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Receipt, Coins, Sliders, RefreshCw, CheckCircle2, HandCoins, Ban } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';

export const FineManagement = () => {
  const toast = useToast();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/collected')) return 'collected';
    return 'pending';
  });

  const [pendingFines, setPendingFines] = useState([]);
  const [collectedFines, setCollectedFines] = useState([]);
  const [settings, setSettings] = useState({
    finePerDay: 5,
    maxFineAmount: 500,
    gracePeriodDays: 0,
    lostBookFineMultiplier: 1.5,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, paidRes, settingsRes] = await Promise.allSettled([
        librarianApi.issues({ fineStatus: 'PENDING' }),
        librarianApi.issues({ fineStatus: 'PAID' }),
        librarianApi.settings(),
      ]);

      if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value?.data)) {
        setPendingFines(pendingRes.value.data);
      }

      if (paidRes.status === 'fulfilled' && Array.isArray(paidRes.value?.data)) {
        setCollectedFines(paidRes.value.data);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettings(settingsRes.value.data);
      }
    } catch {
      toast.error('Failed to load fines data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('/collected')) setActiveTab('collected');
    else setActiveTab('pending');
  }, [location.pathname]);

  const handleUpdateFineStatus = async (issue, fineStatus) => {
    setActionLoadingId(issue.id);
    try {
      await librarianApi.updateFineStatus(issue.id, fineStatus);
      toast.success(fineStatus === 'PAID' ? `Fine of ${formatCurrency(issue.fineAmount)} collected from ${issue.borrowerName}` : `Fine for ${issue.borrowerName} waived`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update fine status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalCollectedAmount = collectedFines.reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);
  const totalPendingAmount = pendingFines.reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);

  const tabs = [
    { id: 'pending', label: 'Pending Fines', count: pendingFines.length },
    { id: 'collected', label: 'Collected Fines', count: collectedFines.length },
  ];

  const columns = [
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
    { title: 'Due Date', key: 'dueDate', render: (val) => formatDate(val) },
    { title: 'Return Date', key: 'returnDate', render: (val) => (val ? formatDate(val) : '—') },
    {
      title: 'Fine Amount',
      key: 'fineAmount',
      sortable: true,
      render: (val) => <span className="font-bold text-xs text-rose-600 dark:text-rose-400">{formatCurrency(val || 0)}</span>,
    },
    {
      title: 'Status',
      key: 'fineStatus',
      sortable: true,
      render: (val) => (
        <Badge variant={val === 'PAID' ? 'success' : val === 'PENDING' ? 'danger' : 'warning'}>
          {val}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => {
        if (row.fineStatus !== 'PENDING') return null;
        const isProcessing = actionLoadingId === row.id;
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleUpdateFineStatus(row, 'PAID')}
              disabled={isProcessing}
              title="Collect Payment"
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-3xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <HandCoins className="h-3.5 w-3.5" />
              <span>Collect</span>
            </button>
            <button
              onClick={() => handleUpdateFineStatus(row, 'WAIVED')}
              disabled={isProcessing}
              title="Waive Fine"
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-3xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Waive</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fines & Penalties Management"
        subtitle="Collect or waive outstanding student dues. Fine rates are configured under Settings > Rules & Fines."
        actions={
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Fine Collected"
          value={formatCurrency(totalCollectedAmount)}
          icon={Coins}
        />
        <StatCard
          title="Outstanding Pending Fines"
          value={formatCurrency(totalPendingAmount)}
          icon={Receipt}
        />
        <StatCard
          title="Daily Overdue Rate"
          value={`₹${settings?.finePerDay ?? 5} / day`}
          icon={Sliders}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : activeTab === 'pending' ? (
        pendingFines.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Pending Fines</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no unpaid overdue fines on record across the school library.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <DataTable
              columns={columns}
              data={pendingFines}
              searchPlaceholder="Search pending fines by student or book..."
              searchKeys={['borrowerName', 'bookTitle', 'borrowerCode']}
              csvFilename="pending_fines.csv"
            />
          </div>
        )
      ) : collectedFines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Receipt className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Fine Collections Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Fine collections recorded upon overdue book returns will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={collectedFines}
            searchPlaceholder="Search collected fines..."
            searchKeys={['borrowerName', 'bookTitle']}
            csvFilename="collected_fines.csv"
          />
        </div>
      )}
    </div>
  );
};
export default FineManagement;
