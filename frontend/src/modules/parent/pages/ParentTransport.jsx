import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_CHILDREN_TRANSPORT } from '../data/mockData';
import { Truck, Phone, User, Clock, MapPin, Map } from 'lucide-react';

export const ParentTransport = () => {
  const { selectedChildId } = useParentAuth();
  const [transport, setTransport] = useState(null);

  useEffect(() => {
    setTransport(MOCK_CHILDREN_TRANSPORT[selectedChildId] || null);
  }, [selectedChildId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Transport Details</h2>
        <p className="text-xs text-slate-500 mt-0.5">Track assigned school bus vehicle, route details, and contact drivers</p>
      </div>

      {transport ? (
        <div className="space-y-6">
          {/* Driver Contact Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Bus Registration No.</p>
                <p className="text-sm font-black text-foreground">{transport.vehicleNo}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Driver Name</p>
                <p className="text-xs font-black text-foreground">{transport.driverName}</p>
                <a
                  href={`tel:${transport.driverPhone}`}
                  className="flex items-center gap-1 text-[10px] text-primary font-bold mt-1"
                >
                  <Phone className="w-3 h-3" /> Call {transport.driverPhone}
                </a>
              </div>
            </Card>
          </div>

          {/* Schedule & Pickups */}
          <Card className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pickup & Drop Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border">
                <Badge variant="primary" className="mb-2">Morning Pickup</Badge>
                <div className="space-y-2 mt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Point: <span className="font-semibold text-foreground">{transport.pickupPoint}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Scheduled Time: <span className="font-semibold text-foreground">{transport.pickupTime}</span></span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border">
                <Badge variant="success" className="mb-2">Afternoon Drop</Badge>
                <div className="space-y-2 mt-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Point: <span className="font-semibold text-foreground">{transport.dropPoint}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Scheduled Time: <span className="font-semibold text-foreground">{transport.dropTime}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Google Maps placeholder */}
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
            <div className="p-4 bg-primary/10 text-primary rounded-full mb-4">
              <Map className="w-8 h-8" />
            </div>
            <h4 className="text-xs font-bold text-foreground">Live Route Map Tracking</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Live location tracking updates when the school bus begins morning or afternoon routes.
            </p>
          </Card>
        </div>
      ) : (
        <Card className="py-12 text-center text-xs text-slate-400">
          No transportation logs linked to this student profile.
        </Card>
      )}
    </div>
  );
};
