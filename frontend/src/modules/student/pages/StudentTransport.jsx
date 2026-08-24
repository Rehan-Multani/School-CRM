import React from 'react';
import { useTransport } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Navigation 
} from 'lucide-react';

export const StudentTransport = () => {
  const { transport } = useTransport();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Driver & Bus Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Vehicle card */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white border-none shadow-premium relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-6 -mb-6"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/10 rounded-xl text-yellow-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block">Assigned Transport</span>
                <h3 className="text-base font-black text-white leading-none mt-1">School Bus Route 14</h3>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider block">Vehicle Number</span>
              <span className="text-xl font-bold tracking-wider text-yellow-400 mt-1 block">{transport.vehicleNo}</span>
            </div>
          </Card>

          {/* Driver details */}
          <Card className="p-5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
              Driver Information
            </h4>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 shrink-0 border border-border">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-foreground truncate leading-none">{transport.driverName}</h4>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Designated Route Driver</span>
              </div>
              <a 
                href={`tel:${transport.driverPhone}`}
                className="p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-colors active:scale-95 duration-100 shrink-0"
                title="Call Driver"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </Card>
        </div>

        {/* Right Column: Route Map & Timings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
              Schedule & Stops
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup stop */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <Badge variant="success" className="text-[8px] uppercase font-bold tracking-wider">Morning Pickup</Badge>
                  <h4 className="text-xs font-bold text-foreground mt-2">{transport.pickupPoint}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimated pickup at {transport.pickupTime}</span>
                  </div>
                </div>
              </div>

              {/* Drop Stop */}
              <div className="p-4 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 flex items-start gap-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <Badge variant="info" className="text-[8px] uppercase font-bold tracking-wider">Afternoon Drop</Badge>
                  <h4 className="text-xs font-bold text-foreground mt-2">{transport.dropPoint}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimated drop at {transport.dropTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Route Map Placeholder */}
          <Card className="p-5 flex flex-col justify-center items-center text-center py-8">
            <div className="p-4 bg-primary/10 rounded-full text-primary mb-3">
              <Navigation className="w-8 h-8" />
            </div>
            <h4 className="text-xs font-bold text-foreground">Interactive Route Tracking</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1">
              Live bus position coordinates overlay is disabled. Contact Admin to active GPS tracking.
            </p>
          </Card>
        </div>

      </div>
    </div>
  );
};
