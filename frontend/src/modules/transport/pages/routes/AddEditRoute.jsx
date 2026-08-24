import React, { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { MOCK_VEHICLES, MOCK_DRIVERS } from '../../utils/constants';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export const AddEditRoute = ({ route, onSuccess, onCancel }) => {
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    id: route?.id || `RTE-0${Math.floor(Math.random() * 900) + 100}`,
    routeName: route?.routeName || '',
    routeCode: route?.routeCode || '',
    startingPoint: route?.startingPoint || 'School Gate',
    endingPoint: route?.endingPoint || '',
    stops: route?.stops || [],
    distance: route?.distance || '10 km',
    estimatedDuration: route?.estimatedDuration || '30 min',
    vehicleId: route?.vehicleId || '',
    driverId: route?.driverId || '',
    status: route?.status || 'Active',
    studentCount: route?.studentCount || 0
  });

  const [newStop, setNewStop] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStop = () => {
    if (!newStop.trim()) {
      toast.error('Stop name cannot be empty.');
      return;
    }
    if (formData.stops.includes(newStop.trim())) {
      toast.error('Stop is already in the list.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, newStop.trim()]
    }));
    setNewStop('');
  };

  const handleRemoveStop = (stopName) => {
    setFormData(prev => ({
      ...prev,
      stops: prev.stops.filter(s => s !== stopName)
    }));
  };

  const handleMoveStop = (index, direction) => {
    const newStops = [...formData.stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStops.length) return;
    
    // Swap
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    
    setFormData(prev => ({ ...prev, stops: newStops }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.routeName.trim() || !formData.routeCode.trim() || !formData.endingPoint.trim()) {
      toast.error('Please specify Route Name, Code, and Ending Point.');
      return;
    }
    if (!formData.stops.length) {
      toast.error('Please add at least one pickup stop.');
      return;
    }
    onSuccess(formData);
    toast.success(route ? 'Route updated!' : 'New Route created!');
  };

  return (
    <div className="space-y-5 text-xs">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Route Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              name="routeName"
              value={formData.routeName}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. North Zone Route A"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Route Code <span className="text-rose-500">*</span></label>
            <input
              type="text"
              name="routeCode"
              value={formData.routeCode}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. NZ-A"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Ending Point Terminal <span className="text-rose-500">*</span></label>
            <input
              type="text"
              name="endingPoint"
              value={formData.endingPoint}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. Satellite Cross Road"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Total Distance</label>
            <input
              type="text"
              name="distance"
              value={formData.distance}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Est. Duration</label>
            <input
              type="text"
              name="estimatedDuration"
              value={formData.estimatedDuration}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Dynamic Stops Builder Section */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <label className="font-extrabold uppercase text-3xs text-slate-450 block tracking-widest border-b pb-1.5">Route Stops Timeline Configuration</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add Stop Location (e.g. Chandkheda Circle)"
              value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              className="flex-1 h-9 px-3 border border-slate-205 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="button"
              onClick={handleAddStop}
              className="h-9 px-3 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-xl flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>

          {/* Stops list with reordering arrows */}
          <div className="space-y-1.5 pt-2">
            {formData.stops.length > 0 ? (
              formData.stops.map((stop, idx) => (
                <div key={stop} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 font-mono text-3xs">#{idx + 1}</span>
                    <span className="font-semibold text-slate-805 dark:text-slate-200">{stop}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'up')}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === formData.stops.length - 1}
                      onClick={() => handleMoveStop(idx, 'down')}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop)}
                      className="p-1 rounded hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-955"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-3xs text-slate-400 font-medium py-2">No stops added yet. Use the input field above.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Assign Vehicle</label>
            <select
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
            >
              <option value="">None / Unassigned</option>
              {MOCK_VEHICLES.map(v => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Assign Driver</label>
            <select
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
            >
              <option value="">None / Unassigned</option>
              {MOCK_DRIVERS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 text-xs font-semibold border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 px-4 text-xs font-semibold bg-cyan-600 hover:bg-cyan-705 text-white rounded-xl shadow-xs"
          >
            Complete Route Config
          </button>
        </div>
      </form>
    </div>
  );
};
