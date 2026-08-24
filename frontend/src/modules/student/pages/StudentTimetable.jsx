import React, { useState } from 'react';
import { useTimetable } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Calendar, Clock, MapPin, User } from 'lucide-react';

export const StudentTimetable = () => {
  const { timetable } = useTimetable();
  const [activeDay, setActiveDay] = useState('monday');

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' }
  ];

  const currentDayClasses = timetable[activeDay] || [];

  return (
    <div className="space-y-6">
      {/* Day Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5 border-b border-border">
        {days.map((d) => (
          <button
            key={d.key}
            onClick={() => setActiveDay(d.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap select-none transition-colors ${
              activeDay === d.key 
                ? 'bg-primary text-white shadow-premium' 
                : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Timeline view of current classes */}
      <div className="space-y-4">
        {currentDayClasses.map((item, i) => (
          <Card key={i} className="p-5 border border-border relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Visual Time Indicator for premium feel */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {/* Period indicator */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-sm">
                P{item.period}
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground leading-tight">{item.subject}</h3>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 mt-2 font-semibold">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{item.teacher}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Classroom {item.room}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
              <Badge variant="info" className="text-xs font-bold px-3 py-1">
                {item.time}
              </Badge>
            </div>

          </Card>
        ))}
      </div>
    </div>
  );
};
