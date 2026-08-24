import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { MapPlaceholder } from '../../components/ui/MapPlaceholder';
import { useToast } from '../../components/ui/Toast';
import { MOCK_PICKUP_POINTS, MOCK_ROUTES } from '../../utils/constants';
import { Plus, Edit2, MapPin, Navigation } from 'lucide-react';

export const PickupPoints = () => {
  const toast = useToast();
  const [pickups, setPickups] = useState(MOCK_PICKUP_POINTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    routeId: '',
    gpsLat: 23.0225,
    gpsLng: 72.5714,
    pickupTime: '07:00',
    dropTime: '14:00',
    studentsAssigned: 0
  });

  const handleEditClick = (point) => {
    setEditingPoint(point);
    setFormData(point);
    setModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingPoint(null);
    setFormData({
      id: `PKP-0${Math.floor(Math.random() * 900) + 100}`,
      name: '',
      routeId: MOCK_ROUTES[0]?.id || '',
      gpsLat: 23.0225,
      gpsLng: 72.5714,
      pickupTime: '07:00',
      dropTime: '14:00',
      studentsAssigned: 0
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Location name cannot be empty.');
      return;
    }

    if (editingPoint) {
      setPickups(prev => prev.map(p => p.id === editingPoint.id ? formData : p));
      toast.success('Pickup Point updated.');
    } else {
      setPickups(prev => [...prev, formData]);
      toast.success('New Pickup Point created.');
    }
    setModalOpen(false);
  };

  const columns = [
    { title: 'Location Name', key: 'name', sortable: true },
    { title: 'Route Code', key: 'routeId', render: (val) => MOCK_ROUTES.find(r => r.id === val)?.routeCode || val },
    { title: 'Pickup Time', key: 'pickupTime', sortable: true },
    { title: 'Drop Time', key: 'dropTime' },
    { title: 'GPS Latitude', key: 'gpsLat' },
    { title: 'GPS Longitude', key: 'gpsLng' },
    { title: 'Students Assigned', key: 'studentsAssigned', sortable: true },
    { title: 'Actions', key: 'actions', render: (_, row) => (
        <button
          onClick={() => handleEditClick(row)}
          className="px-2.5 py-1 text-2xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-705 dark:bg-cyan-955/20 dark:hover:bg-cyan-900/35 rounded-lg flex items-center gap-1"
        >
          <Edit2 className="h-3 w-3" />
          <span>Edit</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 text-xs">
      <PageHeader
        title="Pickup & Drop Terminals"
        subtitle="Manage stop names, check GPS mapping, and specify pickup schedules."
        actions={
          <button
            onClick={handleCreateClick}
            className="h-10 px-4 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Stop</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={pickups}
            searchPlaceholder="Search stop locations..."
            searchKeys={['name']}
            csvFilename="school_pickup_points.csv"
          />
        </div>

        {/* Map display pane */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Live GPS Node Mapping</h3>
          <MapPlaceholder name={pickups[0]?.name} lat={pickups[0]?.gpsLat} lng={pickups[0]?.gpsLng} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPoint ? 'Edit Stop Specs' : 'Register Location Stop Point'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Location Stop Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. Chandkheda Circle"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Linked Route</label>
            <select
              value={formData.routeId}
              onChange={(e) => setFormData(prev => ({ ...prev, routeId: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
            >
              {MOCK_ROUTES.map(r => (
                <option key={r.id} value={r.id}>{r.routeName} ({r.routeCode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">GPS Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.gpsLat}
                onChange={(e) => setFormData(prev => ({ ...prev, gpsLat: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">GPS Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.gpsLng}
                onChange={(e) => setFormData(prev => ({ ...prev, gpsLng: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Pickup Schedule Time</label>
              <input
                type="time"
                value={formData.pickupTime}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Drop Return Time</label>
              <input
                type="time"
                value={formData.dropTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dropTime: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              />
            </div>
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
              Save Stop specs
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
