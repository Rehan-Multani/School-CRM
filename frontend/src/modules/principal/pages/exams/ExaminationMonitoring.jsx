import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { 
  MOCK_EXAMS,
  EXAM_PERFORMANCE
} from '../../utils/constants';

export const ExaminationMonitoring = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const { showToast, ToastComponent } = useToast();

  const handlePublishResults = (examName) => {
    showToast(`Results for ${examName} published and shared with Parent/Student apps!`, 'success');
  };

  // Exam list Columns
  const examColumns = [
    { key: 'name', title: 'Examination Term', sortable: true },
    { key: 'classes', title: 'Target Classes' },
    { key: 'startDate', title: 'Starts Date' },
    { key: 'endDate', title: 'Ends Date' },
    { key: 'marksSubmitted', title: 'Marks Ingest Status' },
    { 
      key: 'resultPublished', 
      title: 'Publications Status',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Badge variant={val ? 'success' : 'warning'}>
            {val ? 'Published' : 'Results Pending'}
          </Badge>
          {!val && (
            <button
              onClick={() => handlePublishResults(row.name)}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[9px] shadow-sm shrink-0"
            >
              Publish Now
            </button>
          )}
        </div>
      )
    }
  ];

  // Subject Marks analysis mock
  const subjectsStats = [
    { subject: 'Physics', highest: 98, average: 76, passRate: 94 },
    { subject: 'Mathematics', highest: 100, average: 71, passRate: 88 },
    { subject: 'English', highest: 95, average: 81, passRate: 98 },
    { subject: 'CS', highest: 99, average: 84, passRate: 96 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Examination Monitoring" 
        subtitle="Observe upcoming exam terms, review grading submission pipelines, and publish final results." 
      />

      <Tabs 
        tabs={[
          { id: 'upcoming', label: 'Upcoming Terms & Results' },
          { id: 'analytics', label: 'Subject Performance Matrix' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'upcoming' && (
        <DataTable 
          columns={examColumns} 
          data={MOCK_EXAMS} 
          searchPlaceholder="Search examinations..."
          searchKey="name"
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recharts wrapper */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Average Term Marks Trend (%)</span>
            <BarChart data={EXAM_PERFORMANCE} dataKey="average" xKey="name" height={220} color="#059669" />
          </div>

          {/* Subject Stats */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block border-b pb-2">Subject Performance Summary</span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-bold">
                <thead>
                  <tr className="text-slate-400">
                    <th className="py-2">Subject</th>
                    <th className="py-2">Highest Score</th>
                    <th className="py-2">Class Average</th>
                    <th className="py-2">Pass Rate (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                  {subjectsStats.map((item, idx) => (
                    <tr key={idx} className="text-slate-700 dark:text-slate-200">
                      <td className="py-2.5 font-bold text-emerald-650">{item.subject}</td>
                      <td className="py-2.5">{item.highest} / 100</td>
                      <td className="py-2.5">{item.average}%</td>
                      <td className="py-2.5 text-emerald-500">{item.passRate}% Pass</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ToastComponent />
    </div>
  );
};
export default ExaminationMonitoring;
