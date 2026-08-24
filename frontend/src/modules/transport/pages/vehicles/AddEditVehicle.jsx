import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/ui/Toast';
import { MOCK_DRIVERS, MOCK_ROUTES } from '../../utils/constants';

export const AddEditVehicle = ({ vehicle, onSuccess, onCancel }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    id: vehicle?.id || `VEH-0${Math.floor(Math.random() * 900) + 100}`,
    vehicleNumber: vehicle?.vehicleNumber || '',
    registrationNumber: vehicle?.registrationNumber || '',
    vehicleType: vehicle?.vehicleType || 'Bus',
    capacity: vehicle?.capacity || 40,
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    manufacturingYear: vehicle?.manufacturingYear || 2026,
    color: vehicle?.color || 'Yellow',
    fuelType: vehicle?.fuelType || 'Diesel',
    insuranceExpiry: vehicle?.insuranceExpiry || '',
    fitnessCertificateExpiry: vehicle?.fitnessCertificateExpiry || '',
    permitExpiry: vehicle?.permitExpiry || '',
    pollutionCertificateExpiry: vehicle?.pollutionCertificateExpiry || '',
    purchaseDate: vehicle?.purchaseDate || new Date().toISOString().split('T')[0],
    currentStatus: vehicle?.currentStatus || 'Active',
    assignedDriverId: vehicle?.assignedDriverId || '',
    assignedRouteId: vehicle?.assignedRouteId || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'capacity' || name === 'manufacturingYear' ? Number(value) : value 
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.vehicleNumber.trim() || !formData.make.trim() || !formData.model.trim()) {
        toast.error('Please specify plate, make and model.');
        return;
      }
    }
    if (step === 3) {
      if (!formData.insuranceExpiry || !formData.pollutionCertificateExpiry) {
        toast.error('Please specify Insurance and Pollution certificate expiries.');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    toast.success(vehicle ? 'Vehicle specs updated!' : 'New Vehicle added to fleet!');
    onSuccess(formData);
  };

  const stepTitles = [
    'Basic Specs',
    'Technical Info',
    'Document Expiry',
    'Circulation Assignment'
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        {stepTitles.map((title, idx) => {
          const index = idx + 1;
          const isActive = index === step;
          const isCompleted = index < step;
          return (
            <div key={title} className="flex-1 flex flex-col items-center text-center">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border",
                isActive 
                  ? "bg-cyan-600 border-cyan-600 text-white shadow-xs" 
                  : isCompleted 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : "bg-slate-50 dark:bg-slate-900 border-slate-205 dark:border-slate-850 text-slate-400"
              )}>
                {index}
              </div>
              <span className={cn(
                "text-4xs font-bold uppercase tracking-wider mt-1.5 hidden sm:block",
                isActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"
              )}>
                {title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Forms steps inputs container */}
      <div className="space-y-4">
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Plate Number (Vehicle ID) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. GJ-01-AB-1234"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Vehicle Type</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Bus">Bus</option>
                <option value="Mini Bus">Mini Bus</option>
                <option value="Van">Van</option>
                <option value="Car">Car</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Make (Brand) <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. Tata"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Model Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. Starbus Ultra"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Capacity Qty</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                min="5"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Fuel Type</label>
              <select
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Manufacturing Year</label>
              <input
                type="number"
                name="manufacturingYear"
                value={formData.manufacturingYear}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Insurance Expiry <span className="text-rose-500">*</span></label>
              <input
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Pollution Certificate Expiry <span className="text-rose-500">*</span></label>
              <input
                type="date"
                name="pollutionCertificateExpiry"
                value={formData.pollutionCertificateExpiry}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">State Road Permit Expiry</label>
              <input
                type="date"
                name="permitExpiry"
                value={formData.permitExpiry}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Fitness Certificate Expiry</label>
              <input
                type="date"
                name="fitnessCertificateExpiry"
                value={formData.fitnessCertificateExpiry}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Assign Driver</label>
              <select
                name="assignedDriverId"
                value={formData.assignedDriverId}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">None / Unassigned</option>
                {MOCK_DRIVERS.map(drv => (
                  <option key={drv.id} value={drv.id}>{drv.name} ({drv.employeeId})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Assign Route</label>
              <select
                name="assignedRouteId"
                value={formData.assignedRouteId}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">None / Unassigned</option>
                {MOCK_ROUTES.map(rte => (
                  <option key={rte.id} value={rte.id}>{rte.routeName} ({rte.routeCode})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
        <button
          onClick={onCancel}
          className="h-10 px-4 text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors"
        >
          Cancel
        </button>
        {step > 1 && (
          <button
            onClick={handleBack}
            className="h-10 px-4 text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors"
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="h-10 px-4 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="h-10 px-4 text-sm font-semibold bg-cyan-600 hover:bg-cyan-705 text-white rounded-xl shadow-xs"
          >
            Save Vehicle Specs
          </button>
        )}
      </div>
    </div>
  );
};
