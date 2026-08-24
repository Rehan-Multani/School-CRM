import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { Megaphone, ChevronDown, ChevronUp } from 'lucide-react';

export const ParentAnnouncements = () => {
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const mockAnnouncements = [
    { id: 1, title: 'Half-Yearly Examination Schedule', type: 'Exam', date: 'July 15', body: 'The complete date sheet for Half-Yearly exams starting from Sept 10 is uploaded in the Exams tab. Hall tickets will be downloadable from Aug 25.' },
    { id: 2, title: 'Independence Day Cultural Event Registration', type: 'Event', date: 'July 12', body: 'Registrations are open for the Independence Day cultural activities including speech, solo song, and drama. Contact your class teacher for submission.' },
    { id: 3, title: 'Advisory on Monsoon Precautionary Measures', type: 'School', date: 'July 10', body: 'Due to ongoing heavy rains, students are advised to wear rain boots, carry umbrellas, and avoid waterlogged areas near the school grounds.' }
  ];

  const typeVariant = { Exam: 'warning', School: 'primary', Event: 'purple' };

  const filtered = filter === 'All'
    ? mockAnnouncements
    : mockAnnouncements.filter(a => a.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Circulars & Notices</h2>
        <p className="text-xs text-slate-500 mt-0.5">Stay updated with official school notices, exam circulars, and holiday notifications</p>
      </div>

      <FilterBar
        filters={[
          { value: 'All', label: 'All Notices' },
          { value: 'School', label: 'School Board' },
          { value: 'Exam', label: 'Exam Circulars' },
          { value: 'Event', label: 'Events Notice' },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState title="No notices found" description="There are no announcements listed in this category." icon={Megaphone} />
        ) : (
          filtered.map(ann => (
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
                <div className="mt-3 pt-3 border-t border-border animate-in fade-in duration-200">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.body}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
