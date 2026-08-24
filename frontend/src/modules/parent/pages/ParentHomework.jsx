import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { EmptyState } from '../components/ui/EmptyState';
import { BookOpen, Clock, CheckCircle2, ChevronRight, FileText, Star } from 'lucide-react';
import { MOCK_HOMEWORK } from '../../student/data/mockData';

export const ParentHomework = () => {
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('pending');
  const [homework, setHomework] = useState([]);
  const [expandedHw, setExpandedHw] = useState(null);

  // Sync with localStorage 'school_homework' key
  useEffect(() => {
    const stored = localStorage.getItem('school_homework');
    if (stored && selectedChildId === 'STU108902') {
      setHomework(JSON.parse(stored));
    } else {
      // Fallback
      setHomework(MOCK_HOMEWORK);
    }
  }, [selectedChildId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('school_homework');
      if (stored && selectedChildId === 'STU108902') {
        setHomework(JSON.parse(stored));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChildId]);

  // Filter based on tab
  const filteredHw = homework.filter(hw => {
    if (tab === 'pending') return hw.status === 'Pending';
    return hw.status === 'Submitted' || hw.status === 'Evaluated';
  });

  const getPriorityVariant = (priority) => {
    if (priority === 'High') return 'danger';
    if (priority === 'Medium') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Homework Tracker</h2>
        <p className="text-xs text-slate-500 mt-0.5">Monitor pending homework assignments, grades, and teacher notes</p>
      </div>

      <FilterBar
        filters={[
          { value: 'pending', label: `Pending (${homework.filter(h => h.status === 'Pending').length})` },
          { value: 'completed', label: `Completed (${homework.filter(h => h.status !== 'Pending').length})` }
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="space-y-4">
        {filteredHw.length === 0 ? (
          <EmptyState
            title={tab === 'pending' ? 'No pending homework!' : 'No completed homework'}
            description={tab === 'pending' ? 'Your child has completed all assigned tasks.' : 'Tasks submitted by your child will appear here.'}
            icon={BookOpen}
          />
        ) : (
          filteredHw.map((hw) => {
            const isExpanded = expandedHw === hw.id;
            return (
              <Card
                key={hw.id}
                onClick={() => setExpandedHw(isExpanded ? null : hw.id)}
                className="transition-all cursor-pointer hover:border-primary/20"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${hw.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={hw.status === 'Pending' ? 'warning' : 'success'}>
                        {hw.status}
                      </Badge>
                      <Badge variant="info">
                        {hw.subject}
                      </Badge>
                      {hw.priority && (
                        <Badge variant={getPriorityVariant(hw.priority)}>
                          {hw.priority} Priority
                        </Badge>
                      )}
                    </div>
                    {/* Aarav Sharma's trigonometry assignment format has title inside description or separate */}
                    <h4 className="text-xs font-black text-foreground mt-1 mb-0.5">
                      {hw.title || hw.subject + ' Assignment'}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{hw.description}</p>

                    <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due: {hw.dueDate}
                      </span>
                      <span>By: {hw.teacher}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in fade-in duration-200">
                        <div>
                          <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructions</h5>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {hw.description}
                          </p>
                        </div>

                        {/* Submission/Grade Information */}
                        {hw.submission && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border space-y-2">
                            <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Child's Submission</h5>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground truncate max-w-[200px]">{hw.submission.fileName}</span>
                              <span className="text-[10px] text-slate-400">Sent: {hw.submission.submittedAt}</span>
                            </div>
                            
                            {hw.submission.marks ? (
                              <div className="mt-3 pt-3 border-t border-border/80 grid grid-cols-2 gap-3">
                                <div>
                                  <h6 className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Marks Awarded</h6>
                                  <p className="text-sm font-black text-primary">{hw.submission.marks}</p>
                                </div>
                                <div>
                                  <h6 className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Feedback</h6>
                                  <p className="text-[10px] text-slate-500 italic">"{hw.submission.feedback}"</p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-[10px] text-amber-500 font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending grading evaluation
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
