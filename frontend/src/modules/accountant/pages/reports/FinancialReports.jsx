import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { PieChart } from '../../components/ui/Charts/PieChart';
import { useToast } from '../../components/ui/Toast';
import { exportToCSV } from '../../utils/exportHelpers';
import { 
  DAILY_FEE_COLLECTION,
  MONTHLY_COLLECTION_TREND,
  FEE_CATEGORY_DISTRIBUTION,
  PENDING_FEES_ANALYSIS,
  PAYMENT_METHOD_DISTRIBUTION,
  MOCK_COLLECTIONS
} from '../../utils/constants';
import { Download } from 'lucide-react';

export const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const { showToast, ToastComponent } = useToast();

  const handleExportCSV = (dataset, name) => {
    exportToCSV(dataset, `${name}_financial_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`${name} report exported to CSV successfully!`, 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Financial Reports & Ledger Analysis" 
        subtitle="Observe school-wide fee categories collection curves, overdue alerts, and download spreadsheets." 
      />

      <Tabs 
        tabs={[
          { id: 'daily', label: 'Daily Collection Flow' },
          { id: 'monthly', label: 'Monthly Trends' },
          { id: 'categories', label: 'Categories Distribution' },
          { id: 'payment-methods', label: 'Payment Channels' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'daily' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block">Daily Collections Curve</span>
            <button
              onClick={() => handleExportCSV(DAILY_FEE_COLLECTION, 'daily_collections')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
          <AreaChart data={DAILY_FEE_COLLECTION} dataKey="collection" xKey="day" height={260} color="#7c3aed" />
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block">Monthly Trends Matrix</span>
            <button
              onClick={() => handleExportCSV(MONTHLY_COLLECTION_TREND, 'monthly_collections')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
          <BarChart data={MONTHLY_COLLECTION_TREND} dataKey="collected" xKey="month" height={260} color="#8b5cf6" />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block">Fees Categories Share Allocation</span>
            <button
              onClick={() => handleExportCSV(FEE_CATEGORY_DISTRIBUTION, 'fee_category_share')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
          <div className="flex justify-center">
            <PieChart data={FEE_CATEGORY_DISTRIBUTION} height={240} colors={["#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc", "#d8b4fe"]} />
          </div>
        </div>
      )}

      {activeTab === 'payment-methods' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block">Disbursement Channels Share</span>
            <button
              onClick={() => handleExportCSV(PAYMENT_METHOD_DISTRIBUTION, 'payment_method_share')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-lg font-bold text-[10px] shadow-sm transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>
          <div className="flex justify-center">
            <PieChart data={PAYMENT_METHOD_DISTRIBUTION} height={240} colors={["#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc"]} />
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};
export default FinancialReports;
