import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { exportToCSV } from '../../utils/exportHelpers';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { 
  MOCK_VEHICLES, 
  MOCK_DRIVERS, 
  MOCK_ROUTES, 
  MOCK_ASSIGNMENTS, 
  MOCK_MAINTENANCE, 
  MOCK_FUEL_LOGS 
} from '../../utils/constants';
import { FileDown, Download } from 'lucide-react';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('vehicles');

  const tabs = [
    { id: 'vehicles', label: 'Fleet Register' },
    { id: 'drivers', label: 'Driver Directory' },
    { id: 'routes', label: 'Route Mapping' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'fees', label: 'Fee Clearance' },
    { id: 'maintenance', label: 'Service Audits' },
    { id: 'fuel', label: 'Fuel Logs' }
  ];

  // Helper export trigger
  const triggerExport = () => {
    let dataset = [];
    let fname = 'export.csv';

    switch (activeTab) {
      case 'vehicles':
        dataset = MOCK_VEHICLES;
        fname = 'vehicles_report.csv';
        break;
      case 'drivers':
        dataset = MOCK_DRIVERS;
        fname = 'drivers_report.csv';
        break;
      case 'routes':
        dataset = MOCK_ROUTES;
        fname = 'routes_report.csv';
        break;
      case 'assignments':
        dataset = MOCK_ASSIGNMENTS;
        fname = 'assignments_report.csv';
        break;
      case 'fees':
        dataset = MOCK_ASSIGNMENTS.map(x => ({ Name: x.studentName, Status: x.feeStatus }));
        fname = 'fees_report.csv';
        break;
      case 'maintenance':
        dataset = MOCK_MAINTENANCE;
        fname = 'maintenance_report.csv';
        break;
      case 'fuel':
        dataset = MOCK_FUEL_LOGS;
        fname = 'fuel_report.csv';
        break;
    }
    exportToCSV(dataset, fname);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <PageHeader
        title="Reports & Analytics Ledger"
        subtitle="Consolidated dashboards and analytics logs. Export datasets directly."
        actions={
          <button
            onClick={triggerExport}
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Download Selected</span>
          </button>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
        {activeTab === 'vehicles' && (
          <DataTable
            columns={[
              { title: 'Plate', key: 'vehicleNumber' },
              { title: 'Type', key: 'vehicleType' },
              { title: 'Make/Model', key: 'make', render: (_, row) => `${row.make} ${row.model}` },
              { title: 'Insurance Expiry', key: 'insuranceExpiry', render: (val) => formatDate(val) },
              { title: 'Status', key: 'currentStatus', render: (val) => <Badge variant={val === 'Active' ? 'success' : 'warning'}>{val}</Badge> }
            ]}
            data={MOCK_VEHICLES}
          />
        )}

        {activeTab === 'drivers' && (
          <DataTable
            columns={[
              { title: 'Emp ID', key: 'employeeId' },
              { title: 'Name', key: 'name' },
              { title: 'License', key: 'licenseNumber' },
              { title: 'Expiry', key: 'licenseExpiry', render: (val) => formatDate(val) },
              { title: 'Status', key: 'status', render: (val) => <Badge variant={val === 'Active' ? 'success' : 'default'}>{val}</Badge> }
            ]}
            data={MOCK_DRIVERS}
          />
        )}

        {activeTab === 'routes' && (
          <DataTable
            columns={[
              { title: 'Route Name', key: 'routeName' },
              { title: 'Code', key: 'routeCode' },
              { title: 'Distance', key: 'distance' },
              { title: 'Stops Count', key: 'stops', render: (val) => val.length },
              { title: 'Assigned Students', key: 'studentCount' }
            ]}
            data={MOCK_ROUTES}
          />
        )}

        {activeTab === 'assignments' && (
          <DataTable
            columns={[
              { title: 'Student', key: 'studentName' },
              { title: 'Class', key: 'class' },
              { title: 'Assigned Route', key: 'routeName' },
              { title: 'Pickup Stop', key: 'pickupPointName' },
              { title: 'Start Date', key: 'startDate', render: (val) => formatDate(val) }
            ]}
            data={MOCK_ASSIGNMENTS}
          />
        )}

        {activeTab === 'fees' && (
          <DataTable
            columns={[
              { title: 'Student Name', key: 'studentName' },
              { title: 'Admission No', key: 'admissionNumber' },
              { title: 'Assigned Route', key: 'routeName' },
              { title: 'Fee Status', key: 'feeStatus', render: (val) => <Badge variant={val === 'Paid' ? 'success' : 'warning'}>{val}</Badge> }
            ]}
            data={MOCK_ASSIGNMENTS}
          />
        )}

        {activeTab === 'maintenance' && (
          <DataTable
            columns={[
              { title: 'Job ID', key: 'id' },
              { title: 'Vehicle Plate', key: 'vehicleNumber' },
              { title: 'Service Type', key: 'maintenanceType' },
              { title: 'Cost', key: 'cost', render: (val) => formatCurrency(val) },
              { title: 'Status', key: 'status', render: (val) => <Badge variant={val === 'Completed' ? 'success' : 'default'}>{val}</Badge> }
            ]}
            data={MOCK_MAINTENANCE}
          />
        )}

        {activeTab === 'fuel' && (
          <DataTable
            columns={[
              { title: 'Log ID', key: 'id' },
              { title: 'Vehicle Plate', key: 'vehicleNumber' },
              { title: 'Date', key: 'date', render: (val) => formatDate(val) },
              { title: 'Quantity', key: 'fuelQuantity', render: (val) => `${val} L` },
              { title: 'Cost', key: 'fuelCost', render: (val) => formatCurrency(val) }
            ]}
            data={MOCK_FUEL_LOGS}
          />
        )}
      </div>
    </div>
  );
};
