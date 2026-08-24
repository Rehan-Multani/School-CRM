import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { 
  MOCK_SYLLABUS,
  MOCK_EVENTS
} from '../../utils/constants';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  Layers 
} from 'lucide-react';

export const AcademicMonitoring = () => {
  const [activeTab, setActiveTab] = useState('classes');

  // Active Classes mock
  const classesList = [
    { class: 'Class 8', sections: 'A, B', totalStudents: 80, classTeacher: 'Mr. David D\'souza', presentToday: 74 },
    { class: 'Class 9', sections: 'A, B, C', totalStudents: 120, classTeacher: 'Mrs. Priya Nair', presentToday: 114 },
    { class: 'Class 10', sections: 'A, B', totalStudents: 95, classTeacher: 'Mrs. Sunita Rao', presentToday: 88 },
    { class: 'Class 11', sections: 'A, B', totalStudents: 75, classTeacher: 'Dr. Ramesh Kumar', presentToday: 70 },
    { class: 'Class 12', sections: 'A, B, C', totalStudents: 110, classTeacher: 'Mr. Anil Joshi', presentToday: 104 }
  ];

  // Subjects list
  const subjectsList = [
    { class: 'Class 10', subject: 'Physics', teacher: 'Dr. Ramesh Kumar', periodsPerWeek: 6 },
    { class: 'Class 10', subject: 'Mathematics', teacher: 'Mrs. Sunita Rao', periodsPerWeek: 8 },
    { class: 'Class 11', subject: 'English', teacher: 'Mr. David D\'souza', periodsPerWeek: 5 },
    { class: 'Class 12', subject: 'Computer Science', teacher: 'Mr. Anil Joshi', periodsPerWeek: 6 },
    { class: 'Class 9', subject: 'Social Studies', teacher: 'Mrs. Priya Nair', periodsPerWeek: 5 }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Academic Monitoring" 
        subtitle="Observe grade structures, subject mappings, course timetables, and overall curriculum completion." 
      />

      <Tabs 
        tabs={[
          { id: 'classes', label: 'Classes & Sections' },
          { id: 'subjects', label: 'Subjects Mapping' },
          { id: 'curriculum', label: 'Curriculum Progression' },
          { id: 'calendar', label: 'School Academic Calendar' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'classes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Class Grade</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Sections</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Class Representative Teacher</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Active Students</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Roll call Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                {classesList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">{item.class}</td>
                    <td className="px-6 py-4">{item.sections}</td>
                    <td className="px-6 py-4">{item.classTeacher}</td>
                    <td className="px-6 py-4 font-bold">{item.totalStudents} Students</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">{item.presentToday} Present</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Class Room</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Course Subject</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Allocated Faculty</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Weekly Classes Periods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                {subjectsList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">{item.class}</td>
                    <td className="px-6 py-4 font-bold text-emerald-650">{item.subject}</td>
                    <td className="px-6 py-4">{item.teacher}</td>
                    <td className="px-6 py-4 font-bold">{item.periodsPerWeek} Periods</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Curriculum Progression Logs</h4>
          </div>

          <div className="space-y-4 max-w-2xl">
            {MOCK_SYLLABUS.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-800 dark:text-white">{item.class} • {item.subject}</span>
                  <span className="text-emerald-605">{item.progress}% Completed</span>
                </div>
                <div className="w-full bg-slate-105 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-650" />
              <span>Upcoming School Events Calendar</span>
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_EVENTS.map(evt => (
              <div key={evt.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <Badge variant="info">{evt.category}</Badge>
                  <Badge variant={evt.status === 'Upcoming' ? 'success' : 'default'}>{evt.status}</Badge>
                </div>
                <span className="font-bold text-slate-900 dark:text-white block pt-1">{evt.name}</span>
                <div className="pt-2 text-[10px] text-slate-405 space-y-1">
                  <p>Scheduled: {evt.date}</p>
                  <p>Manager Lead: {evt.assignedStaff}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default AcademicMonitoring;
