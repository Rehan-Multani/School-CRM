import React, { useState } from 'react';
import { useAttendance } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  UserCheck, 
  CalendarCheck, 
  Clock, 
  FileText, 
  Download, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export const StudentAttendance = () => {
  const { data } = useAttendance();
  const [selectedMonth, setSelectedMonth] = useState('July 2026');

  const handleDownload = () => {
    alert('Attendance report downloaded successfully! (Mock)');
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-2 md:col-span-1">
          <Card className="h-full flex flex-col justify-center items-center text-center p-4 bg-gradient-to-br from-primary to-indigo-600 text-white border-none">
            <h4 className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Overall Attendance</h4>
            <h2 className="text-3xl font-black mt-1">{data.overallPercentage}%</h2>
            <span className="text-[9px] text-white/50 mt-1">Excellent performance</span>
          </Card>
        </div>
        <StatCard title="Present Days" value={`${data.present} Days`} icon={UserCheck} colorClass="bg-emerald-500" />
        <StatCard title="Absent Days" value={`${data.absent} Days`} icon={CalendarCheck} colorClass="bg-rose-500" />
        <StatCard title="Late Arrivals" value={`${data.late} Days`} icon={Clock} colorClass="bg-amber-500" />
        <StatCard title="Approved Leaves" value={`${data.leave} Days`} icon={FileText} colorClass="bg-indigo-500" />
      </div>

      {/* Grid: Calendar View & Analytics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Card */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Calendar View</h3>
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold">{selectedMonth}</span>
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          
          {/* Mock Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {/* Days padding */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square bg-slate-50/20 dark:bg-slate-900/10 rounded-xl"></div>
            ))}
            
            {/* Calendar Days */}
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              let status = 'Present';
              if (day === 8) status = 'Absent';
              if (day === 6) status = 'Leave';
              if (day === 10) status = 'Late';

              const colors = {
                Present: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                Absent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
                Late: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                Leave: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
              };

              return (
                <div 
                  key={day} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl font-bold text-xs cursor-pointer hover:scale-105 transition-transform ${colors[status]}`}
                >
                  <span>{day}</span>
                  <span className="text-[7px] font-medium tracking-wide uppercase mt-0.5">{status}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Analytics Card */}
        <Card className="lg:col-span-1 flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-4 border-b border-border mb-4">
            Attendance Analytics
          </h3>
          <div className="h-[250px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--border-color)" />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} stroke="var(--border-color)" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--card-bg)', 
                    borderColor: 'var(--border-color)', 
                    fontSize: 11,
                    borderRadius: 12
                  }} 
                />
                <Bar dataKey="percentage" fill="var(--color-primary, #4F46E5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance History</h3>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 duration-100 select-none shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-slate-400 uppercase font-bold tracking-wider">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {data.history.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">{row.date}</td>
                  <td className="py-3.5">
                    <Badge variant={
                      row.status === 'Present' ? 'success' : 
                      row.status === 'Absent' ? 'danger' : 
                      row.status === 'Late' ? 'warning' : 'info'
                    }>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-slate-500 dark:text-slate-400">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
