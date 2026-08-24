import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { MOCK_LATE_FEES } from '../../utils/constants';
import { AlertOctagon, HelpCircle, Lock } from 'lucide-react';

export const LateFeeManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [hasOverridePermission, setHasOverridePermission] = useState(false);

  const columns = [
    { key: 'name', title: 'Late Fine Rule Name', sortable: true },
    { key: 'gracePeriodDays', title: 'Grace Period (Days)' },
    { key: 'dailyFine', title: 'Daily Fine Rate (INR)', render: (val) => <span>₹{val} / day</span> },
    { key: 'maximumCap', title: 'Maximum Cap Limit (INR)', render: (val) => <span>₹{val} max</span> },
    { 
      key: 'active', 
      title: 'Rule Status',
      render: (val) => <Badge variant={val ? 'success' : 'default'}>{val ? 'Active' : 'Disabled'}</Badge>
    }
  ];

  const handleToggleOverride = () => {
    setHasOverridePermission(!hasOverridePermission);
    showToast(
      !hasOverridePermission 
        ? 'Manual override mode enabled. Fine calculations can be modified.' 
        : 'Manual override mode disabled. Fines locked to automated calculations.',
      'info'
    );
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      <PageHeader 
        title="Late Fee Management" 
        subtitle="Configure late fine structures, setup grace period rules, or override individual fines." 
      />

      {/* Override Toggle Option */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-violet-50 dark:bg-violet-955/20 text-violet-605 rounded-2xl shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-805 dark:text-white">Manual Override Concessions Toggle</h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1 leading-relaxed">
              Require specific administrative role authorization key to override system calculated fines manually.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          {!hasOverridePermission && <Lock className="w-3.5 h-3.5 text-slate-400" />}
          <button
            onClick={handleToggleOverride}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all shadow-sm ${
              hasOverridePermission 
                ? 'bg-violet-600 hover:bg-violet-700 text-white' 
                : 'bg-slate-50 border hover:bg-slate-100 text-slate-505 dark:bg-slate-950'
            }`}
          >
            {hasOverridePermission ? 'Disable Override Mode' : 'Enable Override Mode'}
          </button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={MOCK_LATE_FEES} 
        searchPlaceholder="Search late rules..."
        searchKey="name"
      />

      <ToastComponent />
    </div>
  );
};
export default LateFeeManagement;
