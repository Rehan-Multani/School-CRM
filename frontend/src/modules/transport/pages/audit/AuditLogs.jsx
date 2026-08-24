import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { MOCK_LOGS } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import { History } from 'lucide-react';

export const AuditLogs = () => {
  const columns = [
    { title: 'Timestamp', key: 'timestamp', render: (val) => formatDateTime(val), sortable: true },
    { title: 'Operator / Manager', key: 'operatorName', sortable: true },
    { title: 'Action Category', key: 'action', filterable: true },
    { title: 'Details / Scope', key: 'details' }
  ];

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <PageHeader
        title="Audit Logs Ledger"
        subtitle="Chronological track ledger of all operations, driver updates, and route modifications."
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        <DataTable
          columns={columns}
          data={MOCK_LOGS}
          searchPlaceholder="Search logs by action or details..."
          searchKeys={['action', 'details', 'operatorName']}
          csvFilename="fleet_operations_audit_log.csv"
        />
      </div>
    </div>
  );
};
