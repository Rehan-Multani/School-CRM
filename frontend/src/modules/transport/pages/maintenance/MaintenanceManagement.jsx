import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MOCK_MAINTENANCE, MOCK_VEHICLES } from '../../utils/constants';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Wrench, Plus, CheckCircle, ShieldAlert } from 'lucide-react';

export const MaintenanceManagement = () => {
  const toast = useToast();
  const [logs, setLogs] = useState(MOCK_MAINTENANCE);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    vehicleId: '',
    maintenanceType: 'Routine Service',
    scheduledDate: '',
    completedDate: '',
    cost: 0,
    vendorName: '',
    status: 'Scheduled',
    description: ''
  });

  const handleAddClick = () => {
    setFormData({
      id: `MNT-0${Math.floor(Math.random() * 900) + 100}`,
      vehicleId: MOCK_VEHICLES[0]?.id || '',
      maintenanceType: 'Routine Service',
      scheduledDate: new Date().toISOString().split('T')[0],
      completedDate: '',
      cost: 0,
      vendorName: '',
      status: 'Scheduled',
      description: ''
    });
    setModalOpen(true);
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!formData.scheduledDate || !formData.vendorName.trim()) {
      toast.error('Scheduled Date and Vendor Name are required.');
      return;
    }

    const veh = MOCK_VEHICLES.find(v => v.id === formData.vehicleId);

    const completeLog = {
      ...formData,
      vehicleNumber: veh?.vehicleNumber || 'GJ-01-AB-1234'
    };

    setLogs(prev => [completeLog, ...prev]);
    toast.success('Maintenance scheduled log created.');
    setModalOpen(false);
  };

  const handleMarkComplete = (logId) => {
    setLogs(prev => prev.map(l => l.id === logId ? {
      ...l,
      status: 'Completed',
      completedDate: new Date().toISOString().split('T')[0]
    } : l));
    toast.success('Maintenance service marked as completed.');
  };

  const totalCosts = logs.reduce((acc, curr) => acc + curr.cost, 0);
  const pendingCount = logs.filter(l => l.status === 'Scheduled').length;

  const columns = [
    { title: 'Job ID', key: 'id', sortable: true },
    { title: 'Vehicle Plate', key: 'vehicleNumber', sortable: true },
    { title: 'Service Type', key: 'maintenanceType', filterable: true },
    { title: 'Scheduled Date', key: 'scheduledDate', render: (val) => formatDate(val), sortable: true },
    { title: 'Completed Date', key: 'completedDate', render: (val) => val ? formatDate(val) : '-' },
    { title: 'Cost', key: 'cost', render: (val) => formatCurrency(val) },
    { title: 'Status', key: 'status', render: (val) => (
        <Badge variant={val === 'Completed' ? 'success' : val === 'In Progress' ? 'warning' : 'default'}>
          {val}
        </Badge>
      )
    },
    { title: 'Actions', key: 'actions', render: (_, row) => (
        <div className="flex gap-1.5">
          {row.status !== 'Completed' && (
            <button
              onClick={() => handleMarkComplete(row.id)}
              className="h-8 px-2.5 text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 transition-colors"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Complete</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 text-xs">
      <PageHeader
        title="Maintenance Schedule"
        subtitle="Manage routine servicing logs, emergency repairs, and track vendor cost distributions."
        actions={
          <button
            onClick={handleAddClick}
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Log Service</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Maintenance Costs" value={formatCurrency(totalCosts)} icon={Wrench} />
        <StatCard title="Pending Service Audits" value={pendingCount} icon={ShieldAlert} />
        <StatCard title="Total Jobs Logged" value={logs.length} icon={Wrench} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="Search maintenance descriptions..."
          searchKeys={['description', 'vehicleNumber', 'vendorName']}
          csvFilename="fleet_service_audits.csv"
        />
      </div>

      {/* Schedule Log Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Fleet Maintenance Job"
        size="md"
      >
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Select Vehicle</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              >
                {MOCK_VEHICLES.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.make})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Maintenance Type</label>
              <select
                value={formData.maintenanceType}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenanceType: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              >
                <option value="Routine Service">Routine Service</option>
                <option value="Emergency Repair">Emergency Repair</option>
                <option value="Tyre Replacement">Tyre Replacement</option>
                <option value="Oil Change">Oil Change</option>
                <option value="Battery Replacement">Battery Replacement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Scheduled Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Service Cost (INR) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Vendor Shop Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.vendorName}
              onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              placeholder="e.g. MRF Tyres Depot"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Job Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-slate-202 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              placeholder="Add checklist specs..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-semibold bg-cyan-600 hover:bg-cyan-705 text-white rounded-xl shadow-xs"
            >
              Schedule Job
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
