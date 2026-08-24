import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_CHILDREN_HOSTEL } from '../data/mockData';
import { Home, Calendar, ShieldAlert } from 'lucide-react';

export const ParentHostel = () => {
  const { selectedChildId } = useParentAuth();
  const [hostel, setHostel] = useState(null);

  useEffect(() => {
    setHostel(MOCK_CHILDREN_HOSTEL[selectedChildId] || null);
  }, [selectedChildId]);

  const hasHostel = hostel && hostel.building !== 'None';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Hostel Status</h2>
        <p className="text-xs text-slate-500 mt-0.5">Dormitory assignments, billing clearing statements, and room attendance</p>
      </div>

      {hasHostel ? (
        <div className="space-y-6">
          {/* Room Allocation details */}
          <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Building</p>
              <p className="text-sm font-black text-foreground mt-1">{hostel.building}</p>
            </div>
            <div className="text-center p-2 border-l border-border">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Floor</p>
              <p className="text-sm font-black text-foreground mt-1">{hostel.floor}</p>
            </div>
            <div className="text-center p-2 border-l border-border">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Room Number</p>
              <p className="text-sm font-black text-foreground mt-1">{hostel.roomNumber}</p>
            </div>
            <div className="text-center p-2 border-l border-border">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Type</p>
              <p className="text-sm font-black text-foreground mt-1">{hostel.roomType}</p>
            </div>
          </Card>

          {/* Billing Clearance Card */}
          <Card className="flex items-center justify-between p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Hostel Fee Balance</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Billing statements for Semester 1</p>
              </div>
            </div>
            <Badge variant="success">{hostel.feeStatus}</Badge>
          </Card>

          {/* Attendance logs */}
          {hostel.attendance && (
            <Card className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hostel Room Attendance</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{hostel.attendance.present}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Nights Present</p>
                </div>
                <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-800">
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400">{hostel.attendance.absent}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Nights Absent (Leave/Outing)</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="py-16 text-center flex flex-col items-center justify-center border-dashed border-2">
          <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400 mb-4">
            <Home className="w-8 h-8" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Day Scholar Profile</h4>
          <p className="text-[10px] text-slate-500 max-w-xs mt-1">
            This student is registered as a Day Scholar. Dormitory hostel rooms are not assigned.
          </p>
        </Card>
      )}
    </div>
  );
};
