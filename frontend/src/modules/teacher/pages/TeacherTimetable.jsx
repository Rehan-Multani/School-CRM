import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { mockTimetable } from '../data/mockData';
import { Clock, MapPin, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUBJECT_COLORS = {
  Mathematics: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  Statistics: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

const getCurrentPeriod = (periods) => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;
  return periods.findIndex(p => {
    const [start] = p.time.split(' - ');
    const [sh, sm] = start.split(':').map(Number);
    const startMin = sh * 60 + sm;
    return Math.abs(currentMinutes - startMin) < 55;
  });
};

export const TeacherTimetable = () => {
  const [tab, setTab] = useState('today');
  const [weekDay, setWeekDay] = useState(0);

  const todayKey = DAY_KEYS[Math.max(0, new Date().getDay() - 1)] || 'monday';
  const todayClasses = mockTimetable[todayKey] || mockTimetable.monday;
  const currentPeriodIndex = getCurrentPeriod(todayClasses);

  const weekDayClasses = mockTimetable[DAY_KEYS[weekDay]] || [];

  const getSubjectColor = (subject) =>
    SUBJECT_COLORS[subject] || 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Timetable</h2>
        <p className="text-xs text-slate-500 mt-0.5">Your teaching schedule at a glance</p>
      </div>

      <FilterBar
        filters={[
          { value: 'today', label: "Today" },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Today's View */}
      {tab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{todayClasses.length} Classes Today</p>
              <p className="text-[10px] text-slate-500 capitalize">{todayKey} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border" />

            <div className="space-y-4">
              {todayClasses.map((cl, i) => {
                const isNow = i === currentPeriodIndex;
                return (
                  <div key={i} className="flex items-start gap-4">
                    {/* Period bullet */}
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-xs font-black z-10 border-2 transition-all ${
                      isNow
                        ? 'bg-primary text-white border-primary shadow-premium scale-105'
                        : 'bg-card text-slate-500 border-border'
                    }`}>
                      P{cl.period}
                    </div>

                    <div className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                      isNow
                        ? `${getSubjectColor(cl.subject)} shadow-premium`
                        : 'bg-card border-border hover:border-primary/20'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-foreground">{cl.subject}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{cl.class}</p>
                        </div>
                        {isNow && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" /> NOW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2.5">
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-3 h-3" /> {cl.time}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3" /> Room {cl.room}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {todayClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-foreground mb-1">No classes today</p>
              <p className="text-xs text-slate-400">Enjoy your free day!</p>
            </div>
          )}
        </div>
      )}

      {/* Weekly View */}
      {tab === 'weekly' && (
        <div className="space-y-4">
          {/* Day selector */}
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setWeekDay(d => Math.max(0, d - 1))} className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40" disabled={weekDay === 0}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2 flex-1 justify-center overflow-x-auto no-scrollbar">
              {DAY_KEYS.map((key, i) => (
                <button
                  key={key}
                  onClick={() => setWeekDay(i)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl text-[10px] font-bold transition-all shrink-0 ${
                    weekDay === i
                      ? 'bg-primary text-white shadow-premium'
                      : 'bg-card border border-border text-slate-500 hover:border-primary/30'
                  }`}
                >
                  <span className="uppercase tracking-wider">{DAY_LABELS[i]}</span>
                  <span className="text-[9px] opacity-70">{(mockTimetable[key] || []).length} cls</span>
                </button>
              ))}
            </div>
            <button onClick={() => setWeekDay(d => Math.min(5, d + 1))} className="p-2 rounded-xl border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40" disabled={weekDay === 5}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {weekDayClasses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-bold text-foreground mb-1">No classes on {DAY_LABELS[weekDay]}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weekDayClasses.map((cl, i) => (
                <Card key={i} className="flex items-center gap-4">
                  <div className={`px-3 py-4 rounded-2xl text-center shrink-0 border ${getSubjectColor(cl.subject)}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider">Period</p>
                    <p className="text-lg font-black leading-none">{cl.period}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-foreground">{cl.subject}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{cl.class}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="w-3 h-3" /> {cl.time}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="w-3 h-3" /> Room {cl.room}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly View */}
      {tab === 'monthly' && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">July 2025 — Teaching Load</h3>
          <div className="space-y-3">
            {DAY_KEYS.map((key, i) => {
              const cls = mockTimetable[key] || [];
              return (
                <div key={key} className="flex items-center gap-4 p-3 rounded-2xl border border-border">
                  <span className="text-[11px] font-bold text-slate-400 w-8 shrink-0">{DAY_LABELS[i]}</span>
                  <div className="flex-1 flex gap-2 flex-wrap">
                    {cls.length === 0 ? (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">No classes</span>
                    ) : (
                      cls.map((c, j) => (
                        <span key={j} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSubjectColor(c.subject)}`}>
                          P{c.period}: {c.subject}
                        </span>
                      ))
                    )}
                  </div>
                  <Badge variant="default">{cls.length}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
