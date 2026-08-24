import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_EXAMS } from '../data/mockData';
import { FileText, Clock, MapPin, Download, AlertCircle } from 'lucide-react';

export const ParentExams = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [exams, setExams] = useState(null);

  useEffect(() => {
    setExams(MOCK_CHILDREN_EXAMS[selectedChildId] || null);
  }, [selectedChildId]);

  const handleDownloadTicket = () => {
    toast.success('Downloading exam hall ticket PDF...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Examinations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track child seat numbers, exam timetables, and rules</p>
        </div>
        <button
          onClick={handleDownloadTicket}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-premium hover:bg-primary-hover active:scale-95 transition-all select-none"
        >
          <Download className="w-3.5 h-3.5" /> Hall Ticket
        </button>
      </div>

      {/* Seat Allocation Info */}
      {exams && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Seat Number</p>
              <p className="text-sm font-black text-foreground">{exams.seatNumber}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Exam Venue Hall</p>
              <p className="text-sm font-black text-foreground">{exams.examHall}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Timetable List */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Exam Date sheet Schedule</h3>
        <div className="space-y-3">
          {exams?.schedule.map((ex) => (
            <Card key={ex.id}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 text-center">
                  <div className="w-14 h-16 bg-primary/10 rounded-2xl flex flex-col items-center justify-center border border-primary/20">
                    <span className="text-[10px] font-bold text-primary uppercase">{new Date(ex.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-black text-primary leading-none">{new Date(ex.date).getDate()}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="primary" className="mb-1">{ex.subject}</Badge>
                  <h4 className="text-xs font-bold text-foreground mt-1">Written Theory Exam</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {ex.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {ex.hall}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Rules Notice */}
      <Card className="border-amber-200 dark:border-amber-950 bg-amber-500/5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-amber-600 mb-1">Important Instructions</h4>
          <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
            <li>Children must carry their printed physical Hall Ticket and Student ID.</li>
            <li>Reporting time at the exam hall is 30 minutes prior to scheduled start.</li>
            <li>Electronic items or mobile phones are strictly prohibited.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
