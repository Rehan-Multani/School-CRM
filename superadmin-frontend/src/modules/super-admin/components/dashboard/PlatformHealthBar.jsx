import React from 'react';
import { Card } from '../ui/Button';

export const PlatformHealthBar = ({ server, database, storage, queue }) => {
  const getStatusColor = (health) => {
    if (health >= 99) return 'bg-emerald-500';
    if (health >= 95) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Platform Health</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Server Core', val: server },
          { label: 'MongoDB Cluster', val: database },
          { label: 'S3 Storage API', val: storage },
          { label: 'Queue Engine', val: queue }
        ].map((item, idx) => (
          <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{item.label}</span>
              <span className="text-slate-800 dark:text-slate-100 font-bold">{item.val}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getStatusColor(item.val)} rounded-full`} style={{ width: `${item.val}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
