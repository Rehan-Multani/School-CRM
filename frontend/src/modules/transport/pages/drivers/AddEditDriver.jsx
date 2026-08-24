import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/ui/Toast';
import { MOCK_VEHICLES } from '../../utils/constants';

export const AddEditDriver = ({ driver, onSuccess, onCancel }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    id: driver?.id || `DRV-0${Math.floor(Math.random() * 900) + 100}`,
    name: driver?.name || '',
    employeeId: driver?.employeeId || `EMP-D-0${Math.floor(Math.random() * 900) + 100}`,
    licenseNumber: driver?.licenseNumber || '',
    licenseCategory: driver?.licenseCategory || 'HMV',
    licenseExpiry: driver?.licenseExpiry || '',
    contactNumber: driver?.contactNumber || '',
    address: driver?.address || '',
    emergencyContact: driver?.emergencyContact || '',
    medicalFitnessDate: driver?.medicalFitnessDate || '',
    policeVerificationDate: driver?.policeVerificationDate || '',
    joiningDate: driver?.joiningDate || new Date().toISOString().split('T')[0],
    assignedVehicleId: driver?.assignedVehicleId || '',
    status: driver?.status || 'Active',
    photoUrl: driver?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.contactNumber.trim()) {
        toast.error('Driver name and contact number are required.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.licenseNumber.trim() || !formData.licenseExpiry) {
        toast.error('License number and expiry date are required.');
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
    toast.success(driver ? 'Driver profile updated!' : 'New Driver registered successfully!');
    onSuccess(formData);
  };

  const stepTitles = [
    'Personal Info',
    'Compliance & License',
    'Vehicle Assignment'
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
                    ? "bg-emerald-50 border-emerald-50 text-white" 
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
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Driver Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. Ramesh Patel"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Contact Number <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. +91-9876543210"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Emergency Contact No.</label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Joining Date</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Residential Address</label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Full address details..."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">License Number <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. GJ0120220012345"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">License Class Category</label>
              <select
                name="licenseCategory"
                value={formData.licenseCategory}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                <option value="LMV">LMV (Light Motor Vehicle)</option>
                <option value="MCWG">MCWG (Motorcycle)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">License Expiry Date <span className="text-rose-500">*</span></label>
              <input
                type="date"
                name="licenseExpiry"
                value={formData.licenseExpiry}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Medical Fitness Verification Date</label>
              <input
                type="date"
                name="medicalFitnessDate"
                value={formData.medicalFitnessDate}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Police Verification Clearance Date</label>
              <input
                type="date"
                name="policeVerificationDate"
                value={formData.policeVerificationDate}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Assign Vehicle</label>
              <select
                name="assignedVehicleId"
                value={formData.assignedVehicleId}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">None / Unassigned</option>
                {MOCK_VEHICLES.map(veh => (
                  <option key={veh.id} value={veh.id}>{veh.vehicleNumber} ({veh.make} {veh.model})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-bold text-slate-550 dark:text-slate-400">Driver Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
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
        {step < 3 ? (
          <button
            onClick={handleNext}
            className="h-10 px-4 text-sm font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="h-10 px-4 text-sm font-semibold bg-cyan-650 hover:bg-cyan-700 text-white rounded-xl shadow-xs"
          >
            Save Driver Account
          </button>
        )}
      </div>
    </div>
  );
};
