import React from 'react';
import { useHostel } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { 
  Home, 
  User, 
  CreditCard, 
  CalendarCheck 
} from 'lucide-react';

export const StudentHostel = () => {
  const { hostel } = useHostel();

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex flex-col justify-center items-center text-center p-5 bg-gradient-to-br from-primary to-indigo-600 text-white border-none shadow-premium">
          <div className="p-3 bg-white/10 rounded-full mb-2">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Hostel Building</span>
          <h2 className="text-lg font-bold mt-1 text-white">{hostel.building}</h2>
          <span className="text-[9px] text-white/50 mt-1">Room {hostel.roomNumber} ({hostel.floor})</span>
        </Card>
        <StatCard title="Room Type" value={hostel.roomType} icon={Home} colorClass="bg-emerald-500" />
        <StatCard title="Hostel Fee Status" value={hostel.feeStatus} icon={CreditCard} colorClass="bg-cyan-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roommates card */}
        <Card className="lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
            Registered Roommates
          </h3>
          <div className="space-y-4">
            {hostel.roommates.map((rm, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{rm.name}</h4>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">Student Roommate</span>
                  </div>
                </div>
                <Badge variant="secondary">Roll No: #{rm.rollNo}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Hostel Attendance */}
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            <span>Residency Attendance</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Days Present</span>
              <span className="text-xl font-black text-emerald-500 mt-1 block">{hostel.attendance.present}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Days Absent</span>
              <span className="text-xl font-black text-rose-500 mt-1 block">{hostel.attendance.absent}</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
