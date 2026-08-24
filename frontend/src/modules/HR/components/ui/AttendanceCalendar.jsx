import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const AttendanceCalendar = ({ attendanceRecords = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper calendar matrix
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayStatusColor = (day) => {
    if (!day) return '';
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendanceRecords.find(r => r.date === dateString);

    if (!record) return 'bg-slate-50 text-slate-400 dark:bg-slate-900';
    if (record.status === 'Present') return 'bg-emerald-500 text-white font-bold';
    if (record.status === 'Late') return 'bg-amber-500 text-white font-bold';
    if (record.status === 'Absent') return 'bg-rose-500 text-white font-bold';
    if (record.status === 'Leave') return 'bg-sky-500 text-white font-bold';
    return 'bg-slate-300 text-slate-700 dark:bg-slate-800';
  };

  return (
    <div className="space-y-4 text-xs font-semibold select-none">
      {/* Month Selector header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
          {monthNames[month]} {year}
        </h4>
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Headers grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[9px]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-bold">
        {calendarDays.map((day, idx) => (
          <div 
            key={idx} 
            className={`aspect-square flex items-center justify-center rounded-xl transition-all ${
              day ? getDayStatusColor(day) : 'opacity-0'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Legend status list */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-amber-500"></div>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-rose-500"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-sky-500"></div>
          <span>Leave</span>
        </div>
      </div>
    </div>
  );
};
export default AttendanceCalendar;
