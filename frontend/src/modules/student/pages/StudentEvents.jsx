import React from 'react';
import { useEvents } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Trophy, Calendar, MapPin, Clock } from 'lucide-react';

export const StudentEvents = () => {
  const { events, registerForEvent } = useEvents();

  const handleRegister = (title) => {
    registerForEvent(title);
    alert(`Successfully registered for: ${title}`);
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <Card className="p-6 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white border-none shadow-premium">
        <h2 className="text-lg font-black leading-none text-white">Events & Activities Calendar</h2>
        <p className="text-xs text-white/80 mt-1">Participate in co-curricular meets, seminars, and sports leagues.</p>
      </Card>

      {/* Grid view of events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upcoming events list */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Open Events</h3>
          
          {events.upcoming.map((ev, i) => (
            <Card key={i} className="p-5 border border-border flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="info" className="text-[8px] uppercase tracking-wider">{ev.category}</Badge>
                  {ev.registered && <Badge variant="success">Registered</Badge>}
                </div>

                <h4 className="text-sm font-bold text-foreground leading-tight">{ev.title}</h4>
                
                <div className="space-y-2 mt-4 text-[10px] text-slate-500 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ev.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ev.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ev.venue}</span>
                  </div>
                </div>
              </div>

              {!ev.registered && (
                <button
                  onClick={() => handleRegister(ev.title)}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 duration-100 select-none mt-6"
                >
                  Register Now
                </button>
              )}
            </Card>
          ))}
        </div>

        {/* School Calendar Month Mock View */}
        <Card className="h-fit">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
            School Calendar Preview
          </h3>
          
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Days padding */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square bg-slate-50/20 dark:bg-slate-900/10 rounded-xl"></div>
            ))}
            
            {/* Calendar Days */}
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              let isEvent = day === 5 || day === 18;
              let isHoliday = day === 15;

              return (
                <div 
                  key={day} 
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl font-bold text-xs relative ${
                    isEvent ? 'border border-primary text-primary' : 
                    isHoliday ? 'border border-rose-500 text-rose-500 bg-rose-500/5' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{day}</span>
                  {isEvent && <span className="absolute bottom-1 w-1.5 h-1.5 bg-primary rounded-full"></span>}
                  {isHoliday && <span className="absolute bottom-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>}
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
};
