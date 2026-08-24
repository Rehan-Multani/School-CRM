import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { InstallmentTimeline } from '../../components/ui/InstallmentTimeline';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { MOCK_INSTALLMENTS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { Eye, CreditCard } from 'lucide-react';

export const InstallmentManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleCollectInstallment = (plan) => {
    showToast(`Initializing fee collection desk for ${plan.studentName}...`, 'info');
  };

  const columns = [
    { key: 'id', title: 'Plan ID', sortable: true },
    { key: 'studentName', title: 'Student Name', sortable: true },
    { 
      key: 'totalAmount', 
      title: 'Total Plan Dues', 
      sortable: true,
      render: (val) => <span className="font-bold">{formatCurrency(val)}</span>
    },
    { 
      key: 'installments', 
      title: 'Current Progress',
      render: (val) => {
        const paidCount = val.filter(i => i.status === 'Paid').length;
        const total = val.length;
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold">{paidCount} / {total} Paid</span>
            <div className="w-14 bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-violet-605 rounded-full" style={{ width: `${(paidCount / total) * 100}%` }}></div>
            </div>
          </div>
        );
      }
    },
    { 
      key: 'status', 
      title: 'Plan Status',
      render: (_, row) => {
        const overdue = row.installments.some(i => i.status === 'Overdue');
        return (
          <Badge variant={overdue ? 'danger' : 'success'}>
            {overdue ? 'Dues Overdue' : 'Active (Good Standing)'}
          </Badge>
        );
      }
    },
    { 
      key: 'actions', 
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedPlan(row)}
            className="p-1.5 bg-slate-50 dark:bg-slate-950 border hover:bg-slate-100 rounded-lg text-slate-500 flex items-center gap-1 font-bold text-[10px]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
          <button
            onClick={() => handleCollectInstallment(row)}
            className="p-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-955/20 text-violet-600 rounded-lg border flex items-center gap-1 font-bold text-[10px]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Collect</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Installment Plan Management" 
        subtitle="Observe multi-step payment schedules, track sequence statuses, and collect upcoming installments." 
      />

      <DataTable 
        columns={columns} 
        data={MOCK_INSTALLMENTS} 
        searchPlaceholder="Search installment plans..."
        searchKey="studentName"
        onRowClick={(row) => setSelectedPlan(row)}
      />

      {/* Visual Installment Timeline modal */}
      {selectedPlan && (
        <Modal 
          isOpen={true} 
          onClose={() => setSelectedPlan(null)} 
          title={`Installment Timeline: ${selectedPlan.studentName}`}
          size="md"
        >
          <InstallmentTimeline plan={selectedPlan} />
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};
export default InstallmentManagement;
