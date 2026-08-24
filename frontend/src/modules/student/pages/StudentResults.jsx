import React from 'react';
import { useResults } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { 
  Trophy, 
  Percent, 
  BarChart2, 
  Download, 
  Printer, 
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';

export const StudentResults = () => {
  const { results } = useResults();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('Report card PDF downloaded successfully! (Mock)');
  };

  return (
    <div className="space-y-6">
      {/* Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-center items-center text-center p-5 bg-gradient-to-br from-primary to-indigo-600 text-white border-none shadow-premium">
          <div className="p-3 bg-white/10 rounded-full mb-2">
            <Trophy className="w-5 h-5 text-yellow-300" />
          </div>
          <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Cumulative GPA</span>
          <h2 className="text-3xl font-black mt-1">{results.gpa}</h2>
          <span className="text-[9px] text-white/50 mt-1">Class Rank: {results.rank}</span>
        </Card>
        <StatCard title="Overall Percentage" value={results.overallPercentage} icon={Percent} colorClass="bg-emerald-500" />
        <StatCard title="Assessment Level" value="Grade A1" icon={CheckCircle} colorClass="bg-cyan-500" />
        <StatCard title="Examination Session" value={results.currentExam} icon={BarChart2} colorClass="bg-indigo-500" />
      </div>

      {/* Grid: Graph & Subject List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Graph */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Comparison Analytics</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Mid Term vs Half Yearly</span>
          </div>

          <div className="h-[260px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={results.previousExamCompare} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="var(--border-color)" />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} stroke="var(--border-color)" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--card-bg)', 
                    borderColor: 'var(--border-color)', 
                    fontSize: 11,
                    borderRadius: 12
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar name="Mid Term" dataKey="midTerm" fill="var(--border-color)" radius={[4, 4, 0, 0]} />
                <Line name="Half Yearly" dataKey="halfYearly" stroke="var(--color-primary, #4F46E5)" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Action Panel */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
              Report Card Controls
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official digital copies of report cards can be generated below. For correction requests, contact the administrative office.
            </p>
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-semibold shadow-premium transition-all active:scale-95 duration-100 select-none"
            >
              <Download className="w-4 h-4" />
              <span>Download Report Card PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 border border-border hover:bg-slate-50 dark:hover:bg-slate-900 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 duration-100 select-none"
            >
              <Printer className="w-4 h-4" />
              <span>Print Results Statement</span>
            </button>
          </div>
        </Card>
      </div>

      {/* Subject details card */}
      <Card>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
          Subject-wise marks list
        </h3>
        <div className="space-y-4">
          {results.subjects.map((sub, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold text-foreground">{sub.subject}</h4>
                  <Badge variant="info" className="text-[9px]">Grade {sub.grade}</Badge>
                </div>
                
                <div className="flex items-start gap-1.5 mt-2 text-[10px] text-slate-500">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="italic leading-normal">Remarks: "{sub.remarks}"</span>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Obtained Score</span>
                  <span className="text-sm font-black text-foreground mt-0.5 block">{sub.score} / {sub.total}</span>
                </div>
                <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ width: `${(sub.score / sub.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
