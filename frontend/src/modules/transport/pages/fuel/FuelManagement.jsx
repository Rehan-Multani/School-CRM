import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MOCK_FUEL_LOGS, MOCK_VEHICLES } from '../../utils/constants';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Fuel, Plus, Calendar } from 'lucide-react';

export const FuelManagement = () => {
  const toast = useToast();
  const [logs, setLogs] = useState(MOCK_FUEL_LOGS);
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    vehicleId: '',
    fuelQuantity: 40,
    fuelCost: 3500,
    odometerReading: 12000,
    fuelStation: '',
    date: ''
  });

  const handleAddClick = () => {
    setFormData({
      id: `FUEL-0${Math.floor(Math.random() * 900) + 100}`,
      vehicleId: MOCK_VEHICLES[0]?.id || '',
      fuelQuantity: 40,
      fuelCost: 3500,
      odometerReading: 45000,
      fuelStation: '',
      date: new Date().toISOString().split('T')[0]
    });
    setModalOpen(true);
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!formData.fuelStation.trim() || !formData.date) {
      toast.error('Date and Fuel Station name are required.');
      return;
    }

    const veh = MOCK_VEHICLES.find(v => v.id === formData.vehicleId);

    const completeLog = {
      ...formData,
      vehicleNumber: veh?.vehicleNumber || 'GJ-01-AB-1234'
    };

    setLogs(prev => [completeLog, ...prev]);
    toast.success('Fuel Refill Log entry recorded.');
    setModalOpen(false);
  };

  const totalFuelQty = logs.reduce((acc, curr) => acc + curr.fuelQuantity, 0);
  const totalFuelCost = logs.reduce((acc, curr) => acc + curr.fuelCost, 0);

  const columns = [
    { title: 'Log ID', key: 'id', sortable: true },
    { title: 'Vehicle Plate', key: 'vehicleNumber', sortable: true },
    { title: 'Date', key: 'date', render: (val) => formatDate(val), sortable: true },
    { title: 'Quantity (L)', key: 'fuelQuantity', render: (val) => `${val} L`, sortable: true },
    { title: 'Total Cost', key: 'fuelCost', render: (val) => formatCurrency(val), sortable: true },
    { title: 'Odometer Reading', key: 'odometerReading', render: (val) => `${val} km` },
    { title: 'Station Name', key: 'fuelStation' }
  ];

  return (
    <div className="space-y-6 text-xs">
      <PageHeader
        title="Fuel Disbursements"
        subtitle="Record quantity, odometer metrics, stations, and track overall mileage costs."
        actions={
          <button
            onClick={handleAddClick}
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Fuel Entry</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fuel Quantity Refilled" value={`${totalFuelQty} Litres`} icon={Fuel} />
        <StatCard title="Total Fuel Disbursements" value={formatCurrency(totalFuelCost)} icon={Fuel} />
        <StatCard title="Total Refills Logged" value={logs.length} icon={Fuel} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="Search fuel stations..."
          searchKeys={['fuelStation', 'vehicleNumber']}
          csvFilename="fleet_fuel_receipts.csv"
        />
      </div>

      {/* Fuel Entry Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Fuel Refill Log"
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
              <label className="font-bold text-slate-550 dark:text-slate-450">Refill Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Quantity (Litres)</label>
              <input
                type="number"
                value={formData.fuelQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, fuelQuantity: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Cost (INR)</label>
              <input
                type="number"
                value={formData.fuelCost}
                onChange={(e) => setFormData(prev => ({ ...prev, fuelCost: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Odometer Reading</label>
              <input
                type="number"
                value={formData.odometerReading}
                onChange={(e) => setFormData(prev => ({ ...prev, odometerReading: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Refill Fuel Station Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.fuelStation}
              onChange={(e) => setFormData(prev => ({ ...prev, fuelStation: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900"
              placeholder="e.g. Adani CNG SG Highway"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold border border-slate-200 dark:border-slate-855 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-semibold bg-cyan-600 hover:bg-cyan-705 text-white rounded-xl shadow-xs"
            >
              Save Refill Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
