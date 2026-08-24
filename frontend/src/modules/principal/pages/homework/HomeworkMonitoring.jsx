import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { 
  MOCK_HOMEWORK 
} from '../../utils/constants';

export const HomeworkMonitoring = () => {
  const [activeTab, setActiveTab] = useState('list');

  // Homework Columns
  const homeworkColumns = [
    { key: 'title', title: 'Homework Topic Title', sortable: true },
    { key: 'class', title: 'Class Room' },
    { key: 'subject', title: 'Course Subject' },
    { key: 'teacherName', title: 'Assigned By' },
    { 
      key: 'submissionRate', 
      title: 'Submission Rate (%)',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${val >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
              style={{ width: `${val}%` }}
            ></div>
          </div>
          <span className="font-bold">{val}% Submitted</span>
        </div>
      )
    },
    { key: 'pendingEvaluation', title: 'Evaluation Pending' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Homework Monitoring" 
        subtitle="Observe daily homework allocation schedules, submission rate percentages, and evaluation pipelines." 
      />

      <Tabs 
        tabs={[
          { id: 'list', label: 'Homework Assignment Pipeline' },
          { id: 'analytics', label: 'Submission Metrics (Recharts)' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'list' && (
        <DataTable 
          columns={homeworkColumns} 
          data={MOCK_HOMEWORK} 
          searchPlaceholder="Search homework by title..."
          searchKey="title"
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Submission Rates by Topic Course</span>
            <BarChart 
              data={MOCK_HOMEWORK.map(h => ({ name: h.subject, rate: h.submissionRate }))} 
              dataKey="rate" 
              xKey="name" 
              height={220} 
              color="#059669" 
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 text-xs font-semibold">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block border-b pb-2">Operational Homework Summary</span>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400">Total Pending Evaluations</span>
              <h4 className="text-xl font-extrabold text-slate-805 mt-1">19 Submissions</h4>
              <p className="text-[10px] text-slate-400 mt-1">Assignments awaiting grading by respective class representatives.</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400">Average Submission Rate</span>
              <h4 className="text-xl font-extrabold text-emerald-600 mt-1">85.0%</h4>
              <p className="text-[10px] text-slate-400 mt-1">Consistent weekly participation rate registered across secondary grades.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HomeworkMonitoring;
