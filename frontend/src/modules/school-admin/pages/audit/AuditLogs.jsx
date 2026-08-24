import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useAppStore } from '../../../../shared/store/useAppStore';

export const AuditLogs = () => {
  const { store } = useAppStore();
  const logs = store.auditLogs || [];

  const columns = [
    { header: 'Action ID', key: 'id', render: (val) => <Badge variant="default">{val}</Badge> },
    { header: 'Action User', key: 'user', render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span> },
    { header: 'Role Scope', key: 'role', render: (val) => <Badge variant="info">{val || 'System'}</Badge> },
    { header: 'Action Performed', key: 'action', render: (val) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{val}</span> },
    { header: 'Details & Impact', key: 'details', render: (val) => <span className="text-xs text-slate-600 dark:text-slate-300">{val}</span> },
    { header: 'Timestamp', key: 'timestamp', render: (val) => val ? new Date(val).toLocaleString() : 'N/A' },
    { header: 'IP Address', key: 'ip', render: (val) => <span className="font-mono text-[11px] text-slate-400">{val || '192.168.1.10'}</span> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Audit Logs Registry" 
        subtitle="Review security changes, track database modifications, and inspect live administrator activity."
      />

      <Tabs 
        tabs={[
          { id: 'logs', label: 'All Operations & Security Logs', count: logs.length }
        ]}
        activeTab="logs"
        onChange={() => {}}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <DataTable columns={columns} data={logs} searchPlaceholder="Search audit trail..." />
      </div>
    </div>
  );
};
export default AuditLogs;
