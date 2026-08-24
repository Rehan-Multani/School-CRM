import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { mockEvents } from '../data/mockData';
import { Trophy, MapPin, Clock, ClipboardList, Calendar } from 'lucide-react';

const typeVariant = { National: 'danger', Academic: 'primary', Meeting: 'info', Competition: 'purple', Event: 'warning' };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TeacherEvents = () => {
  const [tab, setTab] = useState('upcoming');

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

  const eventDates = mockEvents.map(e => new Date(e.date).getDate());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Events</h2>
        <p className="text-xs text-slate-500 mt-0.5">Upcoming events and your assigned duties</p>
      </div>

      <FilterBar
        filters={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'calendar', label: 'Calendar' },
          { value: 'duties', label: 'My Duties' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Upcoming Events */}
      {tab === 'upcoming' && (
        <div className="space-y-4">
          {mockEvents.map(ev => (
            <Card key={ev.id}>
              <div className="flex gap-4">
                <div className="shrink-0 text-center">
                  <div className="w-14 h-16 bg-primary/10 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-primary uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-black text-primary leading-none">{new Date(ev.date).getDate()}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeVariant[ev.type] || 'default'}>{ev.type}</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{ev.title}</h4>
                  <div className="flex flex-wrap gap-3 mb-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {ev.time}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3" /> {ev.venue}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{ev.description}</p>
                  {ev.duty && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 w-fit px-2.5 py-1 rounded-full">
                      <ClipboardList className="w-3 h-3" /> Duty: {ev.duty}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar */}
      {tab === 'calendar' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">
              {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-slate-400">Event</span>
              </div>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for start */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            {/* Days */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const hasEvent = eventDates.includes(day);
              const isToday = day === now.getDate();
              return (
                <div
                  key={day}
                  className={`h-9 flex flex-col items-center justify-center rounded-xl text-xs font-bold relative transition-all ${
                    isToday
                      ? 'bg-primary text-white shadow-premium'
                      : hasEvent
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {day}
                  {hasEvent && !isToday && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Events This Month</h4>
            {mockEvents.map(ev => (
              <div key={ev.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-medium text-foreground">{ev.title}</span>
                </div>
                <span className="text-slate-400">{new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My Duties */}
      {tab === 'duties' && (
        <div className="space-y-4">
          {mockEvents.filter(ev => ev.duty).map(ev => (
            <Card key={ev.id}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground mb-0.5">{ev.title}</h4>
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
                    <ClipboardList className="w-3 h-3" /> {ev.duty}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(ev.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {ev.time}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3" /> {ev.venue}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
