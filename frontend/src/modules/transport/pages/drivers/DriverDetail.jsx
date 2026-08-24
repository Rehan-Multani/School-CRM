import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';
import { MOCK_DRIVERS, MOCK_VEHICLES } from '../../utils/constants';
import { User, ArrowLeft, Calendar, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export const DriverDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const driver = MOCK_DRIVERS.find(d => d.id === id);

  if (!driver) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-550 font-bold">Driver profile not found.</p>
        <button 
          onClick={() => navigate('/transport/drivers')}
          className="text-xs text-cyan-600 font-bold mt-2 hover:underline"
        >
          Back to Registry
        </button>
      </div>
    );
  }

  // Get assigned vehicle info
  const vehicle = MOCK_VEHICLES.find(v => v.assignedDriverId === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/transport/drivers')}
          className="p-2 border border-slate-202 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-550 hover:text-slate-800 dark:hover:text-slate-205 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-505 font-bold uppercase tracking-wider">Driver Detail Profile</span>
      </div>

      {/* Driver Header Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
        <img
          src={driver.photoUrl}
          alt={driver.name}
          className="h-20 w-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-850 shadow-sm shrink-0"
        />
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
            <Badge variant="cyan">{driver.licenseCategory}</Badge>
            <Badge variant={driver.status === 'Active' ? 'success' : 'warning'}>
              {driver.status}
            </Badge>
          </div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
            {driver.name}
          </h2>
          <p className="text-4xs text-slate-450 block font-bold uppercase tracking-wider">Employee ID: {driver.employeeId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b pb-2">Compliance & Verification</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <span className="font-bold text-slate-800 dark:text-slate-200">License Number:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-350">{driver.licenseNumber}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <span className="font-bold text-slate-800 dark:text-slate-200">License Expiry:</span>
              <span className="font-bold text-cyan-600">{formatDate(driver.licenseExpiry)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
              <span className="font-bold text-slate-800 dark:text-slate-200">Police Verification:</span>
              <Badge variant="success">Completed ({formatDate(driver.policeVerificationDate)})</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-955 rounded-xl">
              <span className="font-bold text-slate-800 dark:text-slate-200">Medical Fitness Check:</span>
              <Badge variant="success">Passed ({formatDate(driver.medicalFitnessDate)})</Badge>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest border-b pb-2">Contact & Personal Details</h3>
          <div className="grid grid-cols-2 gap-y-3.5 text-xs pt-1">
            <span className="font-semibold text-slate-450">Contact Number:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver.contactNumber}</span>

            <span className="font-semibold text-slate-450">Emergency Contact:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driver.emergencyContact}</span>

            <span className="font-semibold text-slate-450">Joining Date:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(driver.joiningDate)}</span>

            <span className="font-semibold text-slate-450">Assigned Vehicle:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {vehicle ? `${vehicle.vehicleNumber} (${vehicle.make} ${vehicle.model})` : 'No vehicle assigned'}
            </span>

            <span className="font-semibold text-slate-450">Residential Address:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 leading-normal">{driver.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
