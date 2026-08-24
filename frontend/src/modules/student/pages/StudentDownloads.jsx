import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Download, FileText, FileBadge, Receipt, Shield } from 'lucide-react';

export const StudentDownloads = () => {
  const [activeTab, setActiveTab] = useState('All');

  const categories = ['All', 'Certificate', 'Receipt', 'Academic'];

  const files = [
    { name: 'Student Identity Card (Digital ID)', type: 'Certificate', size: '250 KB', date: '2026-04-12' },
    { name: 'Bonafide Student Certificate', type: 'Certificate', size: '1.2 MB', date: '2026-05-18' },
    { name: 'Quarter 1 Tuition Fee Receipt', type: 'Receipt', size: '150 KB', date: '2026-04-28' },
    { name: 'Mid-Term Marks Assessment Report Card', type: 'Academic', size: '2.4 MB', date: '2026-06-30' },
    { name: 'Science Laboratory Workbook Project File', type: 'Academic', size: '4.8 MB', date: '2026-07-10' }
  ];

  const filteredFiles = activeTab === 'All'
    ? files
    : files.filter(f => f.type === activeTab);

  const handleDownload = (name) => {
    alert(`File downloaded: ${name} (Mock)`);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Certificate': return <FileBadge className="w-5 h-5 text-indigo-500" />;
      case 'Receipt': return <Receipt className="w-5 h-5 text-rose-500" />;
      default: return <FileText className="w-5 h-5 text-cyan-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1.5 border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap select-none transition-colors ${
              activeTab === cat 
                ? 'bg-primary text-white shadow-premium' 
                : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFiles.map((file, i) => (
          <Card key={i} className="p-4 flex items-center justify-between gap-4 border border-border">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500 shrink-0">
                {getIcon(file.type)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">{file.name}</h4>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-1 font-semibold">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[8px]">{file.type}</Badge>
                  <span>{file.size}</span>
                  <span>•</span>
                  <span>Issued: {file.date}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(file.name)}
              className="p-2 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-900 rounded-xl text-slate-500 transition-colors shrink-0 active:scale-95 duration-100 select-none"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
