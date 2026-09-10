import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { MapPin, Clock, Trophy } from 'lucide-react';

export const ParentEvents = () => {
  const [tab, setTab] = useState('upcoming');

  const mockEvents = [
    { id: 1, title: 'Annual Sports Meet 2026', type: 'Sports', date: '2026-08-05', time: '09:00 AM', venue: 'Main Ground', registered: true, description: 'Inter-house athletic track events and final football championship match.' },
    { id: 2, title: 'Parent-Teacher Meeting (PTM)', type: 'Academic', date: '2026-08-10', time: '09:30 AM - 01:30 PM', venue: 'Classrooms', registered: false, description: 'Discuss child progress report sheets, term answers, and feedback guides.' },
    { id: 3, title: 'Inter-School Science Exhibition', type: 'Competition', date: '2026-08-18', time: '10:00 AM', venue: 'Auditorium', registered: false, description: 'Science models demonstration by Class 9 and Class 10 students.' }
  ];

  const typeVariant = { Sports: 'success', Academic: 'warning', Competition: 'purple' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Events & Duties</h2>
        <p className="text-xs text-slate-500 mt-0.5">Explore school events calendar and parent-teacher schedules</p>
      </div>

      <FilterBar
        filters={[
          { value: 'upcoming', label: 'Upcoming Events' },
          { value: 'calendar', label: 'School Calendar' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'upcoming' && (
        <div className="space-y-4">
          {mockEvents.map(ev => (
            <Card key={ev.id}>
              <div className="flex gap-4">
                <div className="shrink-0 text-center">
                  <div className="w-14 h-16 bg-primary/10 rounded-2xl flex flex-col items-center justify-center border border-primary/20">
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
                      <Clock className="w-3.5 h-3.5" /> {ev.time}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5" /> {ev.venue}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{ev.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'calendar' && (
        <Card className="text-center py-12">
          <div className="p-4 bg-primary/10 text-primary rounded-full w-fit mx-auto mb-3">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">August 2026 Academic Calendar</h3>
          <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-2">
            Detailed calendar displaying school holidays, field outings, and examinations schedules.
          </p>
        </Card>
      )}
    </div>
  );
};
