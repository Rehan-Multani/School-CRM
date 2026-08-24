import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { VehicleCard } from '../../components/ui/VehicleCard';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AddEditVehicle } from './AddEditVehicle';
import { MOCK_VEHICLES } from '../../utils/constants';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';

export const VehicleList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState(MOCK_VEHICLES);
  const [viewMode, setViewMode] = useState('grid');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  useEffect(() => {
    if (location.state?.openAddWizard) {
      setWizardOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleAddSuccess = (newVeh) => {
    if (editingVehicle) {
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? newVeh : v));
    } else {
      setVehicles(prev => [...prev, newVeh]);
    }
    setWizardOpen(false);
    setEditingVehicle(null);
  };

  const handleEditClick = (veh) => {
    setEditingVehicle(veh);
    setWizardOpen(true);
  };

  const columns = [
    { title: 'Vehicle Plate', key: 'vehicleNumber', sortable: true, render: (val, row) => (
        <span 
          onClick={() => navigate(`/transport/vehicles/${row.id}`)}
          className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
        >
          {val}
        </span>
      )
    },
    { title: 'Type', key: 'vehicleType', sortable: true, filterable: true },
    { title: 'Capacity', key: 'capacity', sortable: true },
    { title: 'Make / Model', key: 'make', render: (_, row) => `${row.make} ${row.model}` },
    { title: 'Fuel Type', key: 'fuelType', filterable: true },
    { title: 'Status', key: 'currentStatus', render: (val) => (
        <Badge variant={val === 'Active' ? 'success' : val === 'Maintenance' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      )
    },
    { title: 'Actions', key: 'actions', render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/transport/vehicles/${row.id}`)}
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
        title="Fleet Directory"
        subtitle="Manage and track vehicles, safety compliance certificates, and schedules."
        actions={
          <>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-1 flex bg-white dark:bg-slate-950">
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
                setEditingVehicle(null);
                setWizardOpen(true);
              }}
              className="h-10 px-4 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Vehicle</span>
            </button>
          </>
        }
      />

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map(veh => (
            <VehicleCard
              key={veh.id}
              vehicle={veh}
              onView={(v) => navigate(`/transport/vehicles/${v.id}`)}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={vehicles}
            searchPlaceholder="Search vehicles by plate number or type..."
            searchKeys={['vehicleNumber', 'vehicleType', 'make', 'model']}
            csvFilename="school_fleet_directory.csv"
          />
        </div>
      )}

      {/* Add/Edit Wizard Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingVehicle(null);
        }}
        title={editingVehicle ? 'Edit Vehicle Profile' : 'Register Fleet Transport Vehicle'}
        size="lg"
      >
        <AddEditVehicle
          vehicle={editingVehicle}
          onSuccess={handleAddSuccess}
          onCancel={() => {
            setWizardOpen(false);
            setEditingVehicle(null);
          }}
        />
      </Modal>
    </div>
  );
};
