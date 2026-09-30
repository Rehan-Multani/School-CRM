import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { useToast } from '../components/ui/Toast';
import { MOCK_DOWNLOADS } from '../data/mockData';
import { Download, FileText } from 'lucide-react';

export const ParentDownloads = () => {
  const toast = useToast();
  const [filter, setFilter] = useState('all');

  const handleDownload = (title) => {
    toast.success(`Downloading document: ${title}`);
  };

  const categories = [
    { value: 'all', label: 'All Files' },
    { value: 'Student ID Card', label: 'ID Cards' },
    { value: 'Fee Receipts', label: 'Receipts' },
    { value: 'Report Cards', label: 'Report Cards' }
  ];

  const filtered = filter === 'all'
    ? MOCK_DOWNLOADS
    : MOCK_DOWNLOADS.filter(d => d.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Report Center</h2>
        <p className="text-xs text-slate-500 mt-0.5">Download fee receipts, child digital ID cards, and official term report cards</p>
      </div>

      <FilterBar
        filters={categories}
        active={filter}
        onChange={setFilter}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(dl => (
          <Card key={dl.id} className="flex items-center gap-4 border border-border">
            <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="primary" className="text-[8px] uppercase tracking-wider">{dl.category}</Badge>
                <Badge variant="default" className="text-[8px]">{dl.format}</Badge>
              </div>
              <h4 className="text-xs font-bold text-foreground truncate">{dl.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Size: {dl.size} · Created: {dl.date}</p>
            </div>
            <button
              onClick={() => handleDownload(dl.title)}
              className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all select-none shrink-0"
              aria-label={`Download ${dl.title}`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
