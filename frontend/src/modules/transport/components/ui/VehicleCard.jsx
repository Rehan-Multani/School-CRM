import React from 'react';
import { Bus, Eye, Edit2, Wrench } from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../../utils/cn';

export const VehicleCard = ({ vehicle, onView, onEdit, onService }) => {
  const statusColors = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-slate-400',
    Maintenance: 'bg-amber-500',
    Retired: 'bg-rose-500'
  };

  const statusVariants = {
    Active: 'success',
    Inactive: 'default',
    Maintenance: 'warning',
    Retired: 'danger'
  };

  // utilization percentage (random mock fill or fixed based on type)
  const utilization = vehicle.capacity === 8 ? 75 : 85;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:border-cyan-305 dark:hover:border-cyan-900/50 group flex flex-col justify-between">
      <div>
        {/* Header - Plate & Status */}
        <div className="flex justify-between items-start gap-2">
          {/* Yellow Plate Aesthetic */}
          <div className="bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-md border border-amber-500 text-xs font-mono tracking-widest shadow-xs">
            {vehicle.vehicleNumber}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse", statusColors[vehicle.currentStatus])} />
            <Badge variant={statusVariants[vehicle.currentStatus]}>{vehicle.currentStatus}</Badge>
          </div>
        </div>

        {/* Vehicle description */}
        <div className="flex gap-3.5 mt-5">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0 h-11 w-11 flex items-center justify-center">
            <Bus className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{vehicle.make} {vehicle.model}</h4>
            <p className="text-3xs text-slate-450 block mt-0.5">{vehicle.vehicleType} • Capacity: {vehicle.capacity} Seats</p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-4xs font-bold text-slate-450 uppercase">
            <span>Seat Occupancy</span>
            <span>{utilization}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-600 dark:bg-cyan-550 h-full rounded-full transition-all duration-500" 
              style={{ width: `${utilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Footer buttons */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => onView(vehicle)}
          className="flex-1 h-9 text-3xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all duration-150"
        >
          Details
        </button>
        <button
          onClick={() => onEdit(vehicle)}
          className="px-3 h-9 text-3xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-955/20 dark:hover:bg-cyan-900/30 dark:text-cyan-400 rounded-xl transition-all duration-150"
        >
          Edit
        </button>
        {onService && (
          <button
            onClick={() => onService(vehicle)}
            className="p-2 h-9 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
            title="Log Service Maintenance"
          >
            <Wrench className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
