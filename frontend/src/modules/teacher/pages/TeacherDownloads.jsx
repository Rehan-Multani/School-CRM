import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchBar } from '../components/ui/SearchBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { mockDownloads } from '../data/mockData';
import { Download, FileSpreadsheet, FileText, Archive, Calendar, Search } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Resources' },
  { value: 'Class List', label: 'Class Lists' },
  { value: 'Attendance Reports', label: 'Attendance' },
  { value: 'Marks Reports', label: 'Marks' },
  { value: 'Timetable', label: 'Timetable' },
  { value: 'Study Material', label: 'Study Material' },
  { value: 'Teaching Resources', label: 'Teaching resources' },
];

const FORMAT_ICONS = {
  CSV: FileSpreadsheet,
  PDF: FileText,
  ZIP: Archive,
};

const FORMAT_COLORS = {
  CSV: 'text-emerald-500 bg-emerald-500/10',
  PDF: 'text-rose-500 bg-rose-500/10',
  ZIP: 'text-amber-500 bg-amber-500/10',
};

export const TeacherDownloads = () => {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDownload = (title) => {
    toast.success(`Started downloading: ${title}`);
  };

  const filteredDownloads = mockDownloads.filter(dl => {
    const matchesCategory = activeCategory === 'all' || dl.category === activeCategory;
    const matchesSearch = dl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dl.format.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Downloads</h2>
        <p className="text-xs text-slate-500 mt-0.5">Access class lists, schedules, curriculum guides, and performance reports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search reports or documents..."
          className="w-full sm:flex-1"
        />
      </div>

      <FilterBar
        filters={CATEGORIES}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredDownloads.length === 0 ? (
          <div className="sm:col-span-2">
            <EmptyState
              title="No downloads found"
              description="No documents match your filter or search query. Try typing something else."
              icon={Download}
            />
          </div>
        ) : (
          filteredDownloads.map((dl) => {
            const Icon = FORMAT_ICONS[dl.format] || FileText;
            const formatColor = FORMAT_COLORS[dl.format] || 'text-slate-500 bg-slate-500/10';

            return (
              <Card key={dl.id} className="flex items-center gap-4 border border-border">
                <div className={`p-3 rounded-2xl shrink-0 ${formatColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-[8px] uppercase tracking-wide">
                      {dl.category}
                    </Badge>
                    <Badge variant="primary" className="text-[8px]">
                      {dl.format}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">{dl.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Size: {dl.size} • Created: {dl.date}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(dl.title)}
                  className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all select-none shrink-0"
                  aria-label={`Download ${dl.title}`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
