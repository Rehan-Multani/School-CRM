import React, { useState } from 'react';
import { useAnnouncements } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Megaphone, Calendar } from 'lucide-react';

export const StudentAnnouncements = () => {
  const { announcements } = useAnnouncements();
  const [filter, setFilter] = useState('All');

  const categories = ['All', 'Exam', 'School Notice', 'Event'];
  const filteredAnnouncements = filter === 'All'
    ? announcements
    : announcements.filter(a => a.category === filter);

  return (
    <div className="space-y-6">
      {/* Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5 border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap select-none transition-colors ${
              filter === cat 
                ? 'bg-primary text-white shadow-premium' 
                : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Announcement feed list */}
      <div className="space-y-4">
        {filteredAnnouncements.map((ann) => (
          <Card key={ann.id} className="p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <Badge variant={ann.category === 'Exam' ? 'danger' : 'info'} className="text-[8px] uppercase tracking-wider font-bold">
                {ann.category}
              </Badge>
              
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Posted: {ann.date}</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-foreground leading-tight">{ann.title}</h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-3 pt-3 border-t border-border">
              {ann.content}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
