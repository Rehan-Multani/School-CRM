import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { MOCK_CHILDREN_TIMETABLES } from '../data/mockData';
import { Clock, MapPin, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ParentTimetable = () => {
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('today');
  const [weeklyDay, setWeeklyDay] = useState(0);
  const [timetable, setTimetable] = useState(null);

  useEffect(() => {
    setTimetable(MOCK_CHILDREN_TIMETABLES[selectedChildId] || null);
  }, [selectedChildId]);

  const todayKey = 'monday'; // Defaults to monday schedule
  const todayClasses = timetable ? (timetable[todayKey] || []) : [];
  const weeklyClasses = timetable ? (timetable[DAYS[weeklyDay]] || []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Timetable</h2>
        <p className="text-xs text-slate-500 mt-0.5">Your child's classroom schedule</p>
      </div>

      <FilterBar
        filters={[
          { value: 'today', label: "Today's Schedule" },
          { value: 'weekly', label: 'Weekly timetable' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Today's Schedule */}
      {tab === 'today' && (
        <div className="space-y-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border" />

            <div className="space-y-4">
              {todayClasses.map((cl, i) => (
                <div key={i} className="flex items-start gap-4 animate-in fade-in duration-200">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border flex items-center justify-center text-xs font-black text-slate-500">
                    P{cl.period}
                  </div>

                  <div className="flex-1 p-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all">
                    <h4 className="text-xs font-black text-foreground">{cl.subject}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Teacher: {cl.teacher}</p>
                    <div className="flex items-center gap-4 mt-2.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {cl.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Room {cl.room}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {todayClasses.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">No classes scheduled today</p>
          )}
        </div>
      )}

      {/* Weekly Schedule */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setWeeklyDay(d => Math.max(0, d - 1))} className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40" disabled={weeklyDay === 0}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider">{DAY_LABELS[weeklyDay]}</span>
            <button onClick={() => setWeeklyDay(d => Math.min(4, d + 1))} className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40" disabled={weeklyDay === 4}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {weeklyClasses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No classes on this day</p>
          ) : (
            <div className="space-y-3">
              {weeklyClasses.map((cl, i) => (
                <Card key={i} className="flex items-center gap-4 border border-border">
                  <div className="px-3 py-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-center shrink-0 border border-indigo-200 dark:border-indigo-850">
                    <p className="text-[9px] font-bold uppercase tracking-wider">Period</p>
                    <p className="text-lg font-black leading-none">{cl.period}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-foreground">{cl.subject}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Teacher: {cl.teacher}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cl.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Room {cl.room}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
