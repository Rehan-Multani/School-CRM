import React from 'react';
import { useAccountantAuth } from '../context/AccountantAuthContext';
import { useAccountantNotifications } from '../context/AccountantNotificationContext';
import { 
  Users, 
  TrendingUp, 
  IndianRupee, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  Coins,
  Percent,
  CornerUpLeft,
  Receipt
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { useNavigate } from 'react-router-dom';

import {
  DAILY_FEE_COLLECTION,
  MONTHLY_COLLECTION_TREND,
  FEE_CATEGORY_DISTRIBUTION,
  PENDING_FEES_ANALYSIS,
  PAYMENT_METHOD_DISTRIBUTION,
  MOCK_COLLECTIONS
} from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

import { useAppStore } from '../../../shared/store/useAppStore';

export const Dashboard = () => {
  const { user } = useAccountantAuth();
  const { notifications } = useAccountantNotifications();
  const navigate = useNavigate();
  const { store } = useAppStore();

  const receipts = store?.receipts || [];
  const students = store?.students || [];
  const expenses = store?.expenses || [];

  const totalCollected = receipts.reduce((sum, r) => sum + (Number(r.paidAmount || r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPendingDues = students.reduce((sum, s) => sum + (Number(s.pendingFees) || 0), 0) || 125000;
  const totalTransactionsCount = receipts.length + expenses.length;
  const netBalance = totalCollected - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Welcome Board */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <img 
            src={user?.photo} 
            alt={user?.name} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-violet-500 shrink-0 shadow-sm" 
          />
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
              Finance & Ledger Center
            </span>
            <h2 className="text-lg md:text-xl font-black mt-0.5 text-slate-900 dark:text-white">Welcome, {user?.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Employee ID: {user?.employeeId} • {user?.department} • Academic Session {user?.academicSession}
            </p>
          </div>
        </div>
        <div className="text-left md:text-right md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-6">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Ledger Date</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Operations Actions bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Quick Accountant Tools</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button 
            onClick={() => navigate('/accountant/fee-collection')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-violet-50 hover:bg-violet-100 dark:bg-violet-955/20 text-violet-650 dark:text-violet-400 rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <Coins className="w-4 h-4 shrink-0 text-violet-605" />
            <span>Collect Fee</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/fee-structure')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Fee Structure</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/dues')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Pending Dues</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/expenses')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <Receipt className="w-4 h-4 shrink-0 text-slate-400" />
            <span>School Expenses</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/transactions')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <ArrowRight className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Transactions</span>
          </button>
        </div>
      </div>

      {/* 8 Essential Financial KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Collections" value={formatCurrency(totalCollected)} subtitle="fees received this session" icon={TrendingUp} />
        <StatCard title="Outstanding Dues" value={formatCurrency(totalPendingDues)} subtitle="pending student clearance" icon={AlertTriangle} />
        <StatCard title="School Expenses" value={formatCurrency(totalExpenses)} subtitle="total debits & bills" icon={IndianRupee} />
        <StatCard title="Net Cash Position" value={formatCurrency(netBalance)} subtitle="collections minus expenses" icon={IndianRupee} />

        <StatCard title="Ledger Transactions" value={`${totalTransactionsCount} Records`} subtitle="inflow & outflow vouchers" icon={Receipt} />
        <StatCard title="Receipts Generated" value={`${receipts.length} Official Receipts`} subtitle="issued at counter" icon={Receipt} />
        <StatCard title="Expense Vouchers" value={`${expenses.length} Vouchers`} subtitle="approved debits" icon={Receipt} />
        <StatCard title="Active Students" value={`${students.length || 150} Enrolled`} subtitle="fee accounts monitored" icon={Users} />
      </div>

      {/* 5 Financial Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-4">Daily Fee Collection</span>
          <AreaChart data={DAILY_FEE_COLLECTION} dataKey="collection" xKey="day" height={220} color="#7c3aed" />
        </div>

        {/* Chart 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-4">Monthly Collection Trend</span>
          <BarChart data={MONTHLY_COLLECTION_TREND} dataKey="collected" xKey="month" height={220} color="#8b5cf6" />
        </div>

        {/* Chart 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block mb-4">Fee Category Distribution</span>
          <div className="flex-1 flex items-center justify-center">
            <PieChart data={FEE_CATEGORY_DISTRIBUTION} height={200} colors={["#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc", "#d8b4fe"]} />
          </div>
        </div>

        {/* Chart 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-4">Pending Fees Analysis</span>
          <BarChart data={PENDING_FEES_ANALYSIS} dataKey="pending" xKey="class" height={220} color="#8b5cf6" />
        </div>

        {/* Chart 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-455 uppercase tracking-widest block mb-4">Payment Method Distribution (%)</span>
          <div className="flex-1 flex items-center justify-center">
            <PieChart data={PAYMENT_METHOD_DISTRIBUTION} height={200} colors={["#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc"]} />
          </div>
        </div>
      </div>

      {/* Transaction Feed & Alerts Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">Today's Transactions log</h4>
            <button onClick={() => navigate('/accountant/receipts')} className="text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-1">
              <span>View All Receipts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {receipts.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400">
              No Result — No fee transactions recorded today.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-850/50 space-y-3.5">
              {receipts.slice(0, 3).map((item) => (
                <div key={item.id} className="pt-3.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{item.studentName || 'Student'}</span>
                      <Badge variant={item.status === 'Paid' ? 'success' : 'warning'}>{item.status || 'Paid'}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-0.5">Receipt: {item.id || item.receiptNumber} • Method: {item.paymentMethod || 'Online'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">{formatCurrency(item.amount || item.paidAmount || 0)}</span>
                    <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{item.time || 'Today'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Notification feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">Financial Notification log</h4>
          </div>
          <div className="space-y-4 max-h-68 overflow-y-auto no-scrollbar">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0 animate-pulse"></div>
                <div>
                  <span className="font-bold text-slate-905 dark:text-white block">{n.title}</span>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;

