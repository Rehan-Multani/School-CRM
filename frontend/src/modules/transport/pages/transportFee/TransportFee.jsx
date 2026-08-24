import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { MOCK_ASSIGNMENTS } from '../../utils/constants';
import { CreditCard, ShieldCheck, ShieldAlert } from 'lucide-react';

export const TransportFee = () => {
  const [assignments, setAssignments] = useState(MOCK_ASSIGNMENTS);

  const paidCount = assignments.filter(a => a.feeStatus === 'Paid').length;
  const pendingCount = assignments.filter(a => a.feeStatus === 'Pending').length;
  const overdueCount = assignments.filter(a => a.feeStatus === 'Overdue').length;

  const columns = [
    { title: 'Student Name', key: 'studentName', sortable: true },
    { title: 'Admission Number', key: 'admissionNumber', sortable: true },
    { title: 'Linked Route', key: 'routeName' },
    { title: 'Pickup Point', key: 'pickupPointName' },
    { title: 'Odometer/Distance Charge', key: 'routeId', render: () => 'Flat Rate ₹1,200/mo' },
    { title: 'Fee Payment Status', key: 'feeStatus', filterable: true, render: (val) => (
        <Badge variant={val === 'Paid' ? 'success' : val === 'Pending' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <PageHeader
        title="Transport Fee Register"
        subtitle="Check student transport fee payments. Note: Operations are read-only. Collections are done by Accountant module."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Paid Students" value={paidCount} icon={ShieldCheck} />
        <StatCard title="Total Pending Accounts" value={pendingCount} icon={CreditCard} />
        <StatCard title="Total Overdue Accounts" value={overdueCount} icon={ShieldAlert} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        <DataTable
          columns={columns}
          data={assignments}
          searchPlaceholder="Search students fee status..."
          searchKeys={['studentName', 'admissionNumber']}
          csvFilename="transport_fee_clearance.csv"
        />
      </div>
    </div>
  );
};
