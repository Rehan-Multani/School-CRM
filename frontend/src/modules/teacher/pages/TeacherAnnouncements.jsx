import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { mockAnnouncements } from '../data/mockData';
import { Megaphone, ChevronDown, ChevronUp, Bell } from 'lucide-react';

const typeVariant = { Exam: 'warning', School: 'primary', Department: 'info', Holiday: 'success', Emergency: 'danger', Event: 'purple' };

export const TeacherAnnouncements = () => {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const filters = [
    { value: 'All', label: 'All' },
    { value: 'School', label: 'School' },
    { value: 'Department', label: 'Department' },
    { value: 'Exam', label: 'Exam' },
    { value: 'Holiday', label: 'Holiday' },
    { value: 'Emergency', label: 'Emergency' },
    { value: 'Event', label: 'Events' },
  ];

  const filtered = filter === 'All'
    ? mockAnnouncements
    : mockAnnouncements.filter(a => a.type === filter);

  const urgent = filtered.filter(a => a.isUrgent);
  const regular = filtered.filter(a => !a.isUrgent);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Announcements</h2>
        <p className="text-xs text-slate-500 mt-0.5">Stay updated with school and department notices</p>
      </div>

      <FilterBar filters={filters} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No announcements" description="Nothing to display for the selected category" icon={Megaphone} />
      ) : (
        <div className="space-y-4">
          {/* Urgent Pinned */}
          {urgent.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">Urgent Alerts</span>
              </div>
              {urgent.map(ann => (
                <div
                  key={ann.id}
                  className="rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-500/5 overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setExpanded(e => e === ann.id ? null : ann.id)}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="danger" className="text-[8px]">🚨 Urgent</Badge>
                        <span className="text-[10px] text-slate-400">{ann.date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">{ann.title}</h4>
                    </div>
                    {expanded === ann.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </div>
                  {expanded === ann.id && (
                    <div className="px-4 pb-4">
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.body}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Regular */}
          {regular.map(ann => (
            <Card key={ann.id}>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(e => e === ann.id ? null : ann.id)}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={typeVariant[ann.type] || 'default'} className="text-[8px] uppercase tracking-wide">{ann.type}</Badge>
                    <span className="text-[10px] text-slate-400">{ann.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground truncate">{ann.title}</h4>
                  {expanded !== ann.id && (
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{ann.body}</p>
                  )}
                </div>
                {expanded === ann.id ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>
              {expanded === ann.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.body}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
