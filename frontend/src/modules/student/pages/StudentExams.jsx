import React, { useState, useEffect } from 'react';
import { useExams } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  Download, 
  AlertTriangle,
  Timer
} from 'lucide-react';

export const StudentExams = () => {
  const { exams } = useExams();
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const difference = +new Date(exams.countdownToNext) - +new Date();
      if (difference <= 0) {
        setTimeLeft('Exam ongoing or finished');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [exams.countdownToNext]);

  const handleDownloadTicket = () => {
    alert('Hall Ticket PDF downloaded successfully! (Mock)');
  };

  return (
    <div className="space-y-6">
      {/* Countdown Card & Hall Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Countdown */}
        <Card className="bg-gradient-to-br from-indigo-600 to-primary text-white border-none p-6 flex flex-col justify-center items-center text-center">
          <div className="p-3 bg-white/10 rounded-full mb-3">
            <Timer className="w-6 h-6 text-yellow-300" />
          </div>
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Countdown to Next Exam</span>
          <h2 className="text-2xl font-black mt-2 tracking-tight">{timeLeft}</h2>
          <span className="text-[9px] text-white/50 mt-1">First Paper: Mathematics</span>
        </Card>

        {/* Seat & Hall Details */}
        <Card className="p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
              Seat allocation details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-3">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Roll / Seat Number</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">{exams.seatNumber}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Exam Center Hall</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">{exams.examHall}</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDownloadTicket}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl text-xs font-bold shadow-premium transition-all active:scale-95 duration-100 select-none mt-6 w-full md:w-auto self-start px-6"
          >
            <Download className="w-4 h-4" />
            <span>Download Hall Ticket</span>
          </button>
        </Card>

      </div>

      {/* Grid: Schedule & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Schedule */}
        <Card className="lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
            Subject-wise Schedule
          </h3>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-400 uppercase font-bold tracking-wider">
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Timings</th>
                  <th className="pb-3 font-semibold">Hall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {exams.schedule.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="py-3.5 text-slate-800 dark:text-slate-200 font-bold">{row.subject}</td>
                    <td className="py-3.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{row.date}</span>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5"><Badge variant="secondary">{row.hall}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Important Instructions</span>
          </h3>
          <ul className="space-y-3">
            {exams.instructions.map((inst, i) => (
              <li key={i} className="flex gap-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 font-bold text-[10px] text-slate-500">
                  {i + 1}
                </span>
                <span>{inst}</span>
              </li>
            ))}
          </ul>
        </Card>

      </div>
    </div>
  );
};
