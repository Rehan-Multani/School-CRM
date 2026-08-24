import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DriverCard } from '../../components/ui/DriverCard';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AddEditDriver } from './AddEditDriver';
import { MOCK_DRIVERS } from '../../utils/constants';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

export const DriverList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  const [viewMode, setViewMode] = useState('grid');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  useEffect(() => {
    if (location.state?.openAddWizard) {
      setWizardOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleAddSuccess = (newDrv) => {
    if (editingDriver) {
      setDrivers(prev => prev.map(d => d.id === editingDriver.id ? newDrv : d));
    } else {
      setDrivers(prev => [...prev, newDrv]);
    }
    setWizardOpen(false);
    setEditingDriver(null);
  };

  const handleEditClick = (drv) => {
    setEditingDriver(drv);
    setWizardOpen(true);
  };

  const columns = [
    { title: 'Emp ID', key: 'employeeId', sortable: true, render: (val, row) => (
        <span 
          onClick={() => navigate(`/transport/drivers/${row.id}`)}
          className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
        >
          {val}
        </span>
      )
    },
    { title: 'Driver Name', key: 'name', sortable: true },
    { title: 'License No', key: 'licenseNumber' },
    { title: 'License Category', key: 'licenseCategory', filterable: true },
    { title: 'Contact', key: 'contactNumber' },
    { title: 'Status', key: 'status', render: (val) => (
        <Badge variant={val === 'Active' ? 'success' : val === 'On Leave' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      )
    },
    { title: 'Actions', key: 'actions', render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/transport/drivers/${row.id}`)}
            className="px-2.5 py-1 text-2xs font-bold border border-slate-205 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            View
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="px-2.5 py-1 text-2xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-955/20 dark:hover:bg-cyan-900/30 dark:text-cyan-400 rounded-lg"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Registry"
        subtitle="Manage driver profiles, police verifications, licenses, and assigned routes."
        actions={
          <>
            <div className="border border-slate-202 dark:border-slate-800 rounded-xl p-1 flex bg-white dark:bg-slate-950">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === 'grid' ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-955/20 dark:text-cyan-400" : "text-slate-400"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  viewMode === 'list' ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-955/20 dark:text-cyan-400" : "text-slate-400"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingDriver(null);
                setWizardOpen(true);
              }}
              className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Driver</span>
            </button>
          </>
        }
      />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {drivers.map(drv => (
            <DriverCard
              key={drv.id}
              driver={drv}
              onView={(d) => navigate(`/transport/drivers/${d.id}`)}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={drivers}
            searchPlaceholder="Search drivers by name, employee id or license number..."
            searchKeys={['name', 'employeeId', 'licenseNumber']}
            csvFilename="school_drivers_registry.csv"
          />
        </div>
      )}

      {/* Add/Edit Wizard Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingDriver(null);
        }}
        title={editingDriver ? 'Edit Driver Profile' : 'Register New Driver Account'}
        size="lg"
      >
        <AddEditDriver
          driver={editingDriver}
          onSuccess={handleAddSuccess}
          onCancel={() => {
            setWizardOpen(false);
            setEditingDriver(null);
          }}
        />
      </Modal>
    </div>
  );
};
