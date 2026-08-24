import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { DataTable } from '../../components/ui/DataTable';
import { MapPlaceholder } from '../../components/ui/MapPlaceholder';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { MOCK_VEHICLES, MOCK_MAINTENANCE, MOCK_FUEL_LOGS } from '../../utils/constants';
import { Bus, ArrowLeft, ShieldCheck, Wrench, Fuel, Info, Calendar } from 'lucide-react';

export const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const vehicle = MOCK_VEHICLES.find(v => v.id === id);

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-550 font-bold">Vehicle profile not found.</p>
        <button 
          onClick={() => navigate('/transport/vehicles')}
          className="text-xs text-cyan-600 font-bold mt-2 hover:underline"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  // Get specific logs
  const serviceHistory = MOCK_MAINTENANCE.filter(x => x.vehicleId === id);
  const fuelHistory = MOCK_FUEL_LOGS.filter(x => x.vehicleId === id);

  const tabs = [
    { id: 'overview', label: 'Technical Profile' },
    { id: 'compliance', label: 'Compliance & Expiries' },
    { id: 'service', label: 'Service Log', count: serviceHistory.length },
    { id: 'fuel', label: 'Fuel Logs', count: fuelHistory.length },
    { id: 'map', label: 'GPS Tracking' }
  ];

  const serviceColumns = [
    { title: 'Job ID', key: 'id' },
    { title: 'Service Type', key: 'maintenanceType' },
    { title: 'Scheduled Date', key: 'scheduledDate', render: (val) => formatDate(val) },
    { title: 'Completed Date', key: 'completedDate', render: (val) => val ? formatDate(val) : '-' },
    { title: 'Cost', key: 'cost', render: (val) => formatCurrency(val) },
    { title: 'Vendor', key: 'vendorName' },
    { title: 'Status', key: 'status', render: (val) => (
        <Badge variant={val === 'Completed' ? 'success' : val === 'In Progress' ? 'warning' : 'default'}>
          {val}
        </Badge>
      )
    }
  ];

  const fuelColumns = [
    { title: 'Log ID', key: 'id' },
    { title: 'Date', key: 'date', render: (val) => formatDate(val) },
    { title: 'Quantity', key: 'fuelQuantity', render: (val) => `${val} L` },
    { title: 'Total Cost', key: 'fuelCost', render: (val) => formatCurrency(val) },
    { title: 'Odometer', key: 'odometerReading', render: (val) => `${val} km` },
    { title: 'Station', key: 'fuelStation' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/transport/vehicles')}
          className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-205 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fleet Detail Profile</span>
      </div>

      {/* Vehicle Summary Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
        <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-2xl shrink-0">
          <Bus className="h-10 w-10" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-md border border-amber-500 text-3xs font-mono tracking-widest">
              {vehicle.vehicleNumber}
            </div>
            <Badge variant="cyan">{vehicle.vehicleType}</Badge>
            <Badge variant={vehicle.currentStatus === 'Active' ? 'success' : 'warning'}>
              {vehicle.currentStatus}
            </Badge>
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
            {vehicle.make} {vehicle.model} ({vehicle.manufacturingYear})
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Panel Body */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b pb-2">Technical Profile Specification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="grid grid-cols-2 gap-y-3">
                <span className="font-semibold text-slate-450">Registration Number:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vehicle.registrationNumber}</span>
                <span className="font-semibold text-slate-450">Capacity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vehicle.capacity} Seats</span>
                <span className="font-semibold text-slate-450">Fuel Type:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vehicle.fuelType}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-3">
                <span className="font-semibold text-slate-450">Color:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{vehicle.color}</span>
                <span className="font-semibold text-slate-450">Purchase Date:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(vehicle.purchaseDate)}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b pb-2">Compliance Certificates Expiry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Insurance Expiry:</span>
                  <span className="font-bold text-cyan-600">{formatDate(vehicle.insuranceExpiry)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Fitness Certificate Expiry:</span>
                  <span className="font-bold text-cyan-600">{formatDate(vehicle.fitnessCertificateExpiry)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="font-bold text-slate-800 dark:text-slate-200">State Road Permit Expiry:</span>
                  <span className="font-bold text-cyan-600">{formatDate(vehicle.permitExpiry)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Pollution Certificate Expiry:</span>
                  <span className="font-bold text-cyan-600">{formatDate(vehicle.pollutionCertificateExpiry)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'service' && (
          <DataTable
            columns={serviceColumns}
            data={serviceHistory}
            searchPlaceholder="Search maintenance works..."
            searchKeys={['maintenanceType', 'vendorName']}
          />
        )}

        {activeTab === 'fuel' && (
          <DataTable
            columns={fuelColumns}
            data={fuelHistory}
            searchPlaceholder="Search fuel refils..."
            searchKeys={['fuelStation', 'id']}
          />
        )}

        {activeTab === 'map' && (
          <div className="max-w-2xl mx-auto">
            <MapPlaceholder name={`Vehicle Location GJ-01-AB-1234`} />
          </div>
        )}
      </div>
    </div>
  );
};
