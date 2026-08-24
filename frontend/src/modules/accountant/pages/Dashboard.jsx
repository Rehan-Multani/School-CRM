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
  const { receipts = [], students = [] } = useAppStore();

  const totalCollected = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalReceiptsCount = receipts.length;

  return (
    <div className="space-y-6">
      {/* Welcome Board */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img 
            src={user?.photo} 
            alt={user?.name} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-violet-500 shrink-0" 
          />
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase">
              Finance & Ledger Center
            </span>
            <h2 className="text-lg md:text-xl font-black mt-0.5">Welcome, {user?.name}</h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Employee ID: {user?.employeeId} • {user?.department} • Academic Session {user?.academicSession}
            </p>
          </div>
        </div>
        <div className="text-left md:text-right md:border-l md:border-slate-850 md:pl-6">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Ledger Date</span>
          <span className="text-xs font-bold text-slate-350 mt-1 block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Operations Actions bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Quick Ledger Tools</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button 
            onClick={() => navigate('/accountant/fee-collection')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-violet-50 hover:bg-violet-100 dark:bg-violet-955/20 text-violet-650 dark:text-violet-400 rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <Coins className="w-4 h-4 shrink-0 text-violet-605" />
            <span>Collect Fee</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/receipts')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <Receipt className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Generate Receipt</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/fee-collection')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <Users className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Search Student</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/reports')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-400" />
            <span>View Reports</span>
          </button>
          <button 
            onClick={() => navigate('/accountant/refunds')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-350 border rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <CornerUpLeft className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Issue Refund</span>
          </button>
        </div>
      </div>

      {/* 12 Quick Statistics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Today's Collection" value={`₹${totalCollected.toLocaleString()}`} subtitle="received today" icon={IndianRupee} />
        <StatCard title="Monthly Collection" value={`₹${totalCollected.toLocaleString()}`} subtitle="collected this month" icon={TrendingUp} />
        <StatCard title="Yearly Collection" value={`₹${totalCollected.toLocaleString()}`} subtitle="current academic cycle" icon={IndianRupee} />
        <StatCard title="Pending Fees" value="₹0" subtitle="unpaid outstanding dues" icon={AlertTriangle} />

        <StatCard title="Overdue Fees" value="₹0" subtitle="past installment deadlines" icon={AlertTriangle} />
        <StatCard title="Today's Transactions" value={`${totalReceiptsCount} Receipts`} subtitle="processed at desk" icon={Receipt} />
        <StatCard title="Refund Requests" value="0 Pending" subtitle="awaiting verification approval" icon={CornerUpLeft} />
        <StatCard title="Scholarships Applied" value="0 Active" subtitle="merit concessions registered" icon={Percent} />

        <StatCard title="Discounts Given" value="₹0" subtitle="waivers" icon={Percent} />
        <StatCard title="Total Students Paid Today" value={totalReceiptsCount === 0 ? "00" : `${totalReceiptsCount}`} subtitle="cleared transactions" icon={Users} />
        <StatCard title="Total Pending Students" value="00" subtitle="requires dues notice reminders" icon={Clock} />
        <StatCard title="Active Installments" value="0 Plans" subtitle="multi-step payments schedules" icon={Coins} />
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
          <div className="flex items-center justify-between pb-3 border-b">
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
          <div className="flex items-center justify-between pb-3 border-b">
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

