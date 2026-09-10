import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { BarChartWidget } from '../components/ui/Chart';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_RESULTS } from '../data/mockData';
import { Download, GraduationCap, Trophy, FileSpreadsheet, Percent } from 'lucide-react';

export const ParentResults = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('scores');
  const [results, setResults] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('school_results');
    if (stored && selectedChildId === 'STU108902') {
      setResults(JSON.parse(stored));
    } else {
      setResults(MOCK_CHILDREN_RESULTS[selectedChildId] || null);
    }
  }, [selectedChildId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('school_results');
      if (stored && selectedChildId === 'STU108902') {
        setResults(JSON.parse(stored));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChildId]);

  const handleDownloadCard = () => {
    toast.success('Downloading official report card PDF...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Academic Results</h2>
          <p className="text-xs text-slate-500 mt-0.5">Review term-wise grades, rankings, and teacher feedback reports</p>
        </div>
        <button
          onClick={handleDownloadCard}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-premium hover:bg-primary-hover active:scale-95 transition-all select-none"
        >
          <Download className="w-3.5 h-3.5" /> Report Card
        </button>
      </div>

      {/* Top Performance Indicators */}
      {results && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center flex flex-col justify-center items-center gap-1">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            <p className="text-xl font-black text-foreground mt-1">{results.gpa}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CGPA Score</p>
          </Card>
          <Card className="text-center flex flex-col justify-center items-center gap-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <p className="text-xl font-black text-foreground mt-1">{results.rank}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Class Rank</p>
          </Card>
          <Card className="text-center flex flex-col justify-center items-center gap-1">
            <Percent className="w-5 h-5 text-emerald-500" />
            <p className="text-xl font-black text-foreground mt-1">{results.overallPercentage}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Agg. Marks %</p>
          </Card>
        </div>
      )}

      <FilterBar
        filters={[
          { value: 'scores', label: 'Marks & Remarks' },
          { value: 'compare', label: 'Term Performance Comparison' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Subject Scores */}
      {tab === 'scores' && results && (
        <div className="space-y-3">
          {results.subjects.map((sub, idx) => (
            <Card key={idx} className="border border-border">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h4 className="text-xs font-black text-foreground">{sub.subject}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Exam Max: {sub.total || 100}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-foreground">{sub.score}%</span>
                  <Badge variant={sub.grade.startsWith('A') ? 'success' : 'primary'}>{sub.grade}</Badge>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-2">
                Teacher Remarks: "{sub.remarks || 'No remarks provided'}"
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Term Comparison Charts */}
      {tab === 'compare' && results && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Exam Marks Progression</h3>
          <BarChartWidget
            data={results.previousExamCompare}
            xKey="subject"
            bars={[
              { key: 'midTerm', label: 'Mid Term Marks %', color: '#8B5CF6' },
              { key: 'halfYearly', label: 'Half Yearly Marks %', color: '#4F46E5' }
            ]}
            height={240}
          />
        </Card>
      )}
    </div>
  );
};
