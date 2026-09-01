import React, { useState, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Download, 
  Filter, 
  CreditCard,
  Printer
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelpers';

export const Transactions = () => {
  const { store } = useAppStore();
  const { showToast, ToastComponent } = useToast();

  const receipts = store?.receipts || [];
  const expenses = store?.expenses || [];

  const [activeTab, setActiveTab] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('ALL');

  // Build unified double-entry ledger items
  const ledgerItems = useMemo(() => {
    const credits = receipts.map((r) => ({
      id: r.id || r.receiptNo,
      refNo: r.receiptNo || r.id,
      date: r.paymentDate || r.date || '2026-08-30',
      time: r.time || '10:30 AM',
      entity: r.studentName || 'Student',
      description: `Student Fee Collection • ${r.class ? `Class ${r.class}` : 'Academic Fee'}`,
      type: 'CREDIT',
      category: 'Fee Collection',
      channel: r.paymentMethod || 'UPI',
      amount: Number(r.paidAmount || r.amount || 0)
    }));

    const debits = expenses.map((e) => ({
      id: e.id || e.voucherNo,
      refNo: e.voucherNo || e.id,
      date: e.date || '2026-08-30',
      time: '12:00 PM',
      entity: e.payee || 'Vendor',
      description: e.title || 'Operational Expense',
      type: 'DEBIT',
      category: e.category || 'School Expense',
      channel: e.paymentMethod || 'Bank Transfer',
      amount: Number(e.amount || 0)
    }));

    // Combine and sort chronologically descending
    const combined = [...credits, ...debits].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Compute running balance
    let running = 0;
    return combined.map((item) => {
      if (item.type === 'CREDIT') {
        running += item.amount;
      } else {
        running -= item.amount;
      }
      return { ...item, balanceAfter: running };
    });
  }, [receipts, expenses]);

  const totalCredits = ledgerItems
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = ledgerItems
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalCredits - totalDebits;

  // Filter by Tab and Channel
  const filteredTransactions = useMemo(() => {
    let list = ledgerItems;
    if (activeTab === 'credits') {
      list = list.filter((t) => t.type === 'CREDIT');
    } else if (activeTab === 'debits') {
      list = list.filter((t) => t.type === 'DEBIT');
    }

    if (selectedChannel !== 'ALL') {
      list = list.filter((t) => t.channel.toLowerCase().includes(selectedChannel.toLowerCase()));
    }
    return list;
  }, [ledgerItems, activeTab, selectedChannel]);

  const handleExport = () => {
    exportToCSV(filteredTransactions, `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Ledger exported to CSV successfully.', 'success');
  };

  const columns = [
    {
      key: 'refNo',
      title: 'Txn / Ref No',
      sortable: true,
      render: (v) => <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{v}</span>
    },
    {
      key: 'date',
      title: 'Date & Time',
      sortable: true,
      render: (v, row) => (
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(v)}</div>
          <div className="text-[10px] text-slate-400">{row.time}</div>
        </div>
      )
    },
    {
      key: 'entity',
      title: 'Party / Description',
      sortable: true,
      render: (v, row) => (
        <div>
          <div className="font-bold text-slate-850 dark:text-slate-100">{v}</div>
          <div className="text-[11px] text-slate-400 truncate max-w-xs">{row.description}</div>
        </div>
      )
    },
    {
      key: 'type',
      title: 'Flow Type',
      render: (v) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            v === 'CREDIT'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}
        >
          {v === 'CREDIT' ? '+ INFLOW (CR)' : '- OUTFLOW (DR)'}
        </span>
      )
    },
    {
      key: 'channel',
      title: 'Payment Channel',
      render: (v) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {v}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Amount (₹)',
      sortable: true,
      render: (v, row) => (
        <span
          className={`font-black ${
            row.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {row.type === 'CREDIT' ? '+' : '-'}{formatCurrency(v || 0)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complete Transactions Ledger"
        subtitle="Consolidated real-time financial register of student fee collections (Credits) and school expenditures (Debits)."
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Register</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Inflow (Credits)"
          value={formatCurrency(totalCredits)}
          subtitle="fees & collection receipts"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Outflow (Debits)"
          value={formatCurrency(totalDebits)}
          subtitle="school operational expenses"
          icon={TrendingDown}
        />
        <StatCard
          title="Net Cash Position"
          value={formatCurrency(netBalance)}
          subtitle="inflow minus outflow"
          icon={Scale}
        />
        <StatCard
          title="Ledger Records"
          value={`${ledgerItems.length}`}
          subtitle="total book entries"
          icon={ArrowLeftRight}
        />
      </div>

      {/* Filter and Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: `All Transactions (${ledgerItems.length})` },
            { id: 'credits', label: `Inflows / Credits (${receipts.length})` },
            { id: 'debits', label: `Outflows / Debits (${expenses.length})` }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Channel Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Payment Channels</option>
            <option value="UPI">UPI / QR</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredTransactions}
          searchPlaceholder="Search by reference, party name, or description..."
          searchKey="entity"
          emptyMessage="No ledger transactions found matching the filter."
        />
      </div>

      <ToastComponent />
    </div>
  );
};
export default Transactions;
