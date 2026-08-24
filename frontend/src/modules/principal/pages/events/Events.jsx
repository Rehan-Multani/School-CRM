import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Users } from 'lucide-react';
import { MOCK_EVENTS } from '../../utils/constants';

export const Events = () => {
  const [activeTab, setActiveTab] = useState('list');

  const columns = [
    { key: 'name', title: 'School Event Name', sortable: true },
    { 
      key: 'category', 
      title: 'Category type',
      render: (val) => <Badge variant="info">{val}</Badge>
    },
    { key: 'date', title: 'Scheduled Date', sortable: true },
    { key: 'assignedStaff', title: 'Lead Representative' },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => (
        <Badge variant={val === 'Upcoming' ? 'success' : 'warning'}>
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Events Monitoring" 
        subtitle="Track upcoming school functions, science seminars, parent meetings, and sports tournaments." 
      />

      <Tabs 
        tabs={[
          { id: 'list', label: 'School Calendar Events' },
          { id: 'overview', label: 'Events Logistics Summary' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'list' && (
        <DataTable 
          columns={columns} 
          data={MOCK_EVENTS} 
          searchPlaceholder="Search school events..."
          searchKey="name"
        />
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_EVENTS.map((evt) => (
            <div key={evt.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-[10px] font-black uppercase text-slate-400">{evt.category}</span>
                <Badge variant="success">{evt.status}</Badge>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-805 dark:text-white leading-tight">{evt.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium">Scheduled Date: {evt.date}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Event Coordinator</span>
                  <span className="text-slate-800 dark:text-slate-200 block">{evt.assignedStaff}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Events;
