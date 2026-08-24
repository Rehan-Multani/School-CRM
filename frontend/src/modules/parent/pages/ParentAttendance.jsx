import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_ATTENDANCE } from '../data/mockData';
import { BarChartWidget } from '../components/ui/Chart';
import { Download, Calendar, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

const statusColor = {
  Present: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  Absent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  Late: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Leave: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ParentAttendance = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('calendar');
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('school_attendance');
    if (stored && selectedChildId === 'STU108902') {
      setAttendance(JSON.parse(stored));
    } else {
      setAttendance(MOCK_CHILDREN_ATTENDANCE[selectedChildId] || null);
    }
  }, [selectedChildId]);

  // Sync reactive state
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('school_attendance');
      if (stored && selectedChildId === 'STU108902') {
        setAttendance(JSON.parse(stored));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedChildId]);

  const handleDownloadReport = () => {
    toast.success('Downloading attendance sheet...');
  };

  const getAttendanceSummary = () => {
    if (!attendance) return [];
    return [
      { label: 'Present', count: attendance.present, color: 'text-emerald-500 bg-emerald-500/10' },
      { label: 'Absent', count: attendance.absent, color: 'text-rose-500 bg-rose-500/10' },
      { label: 'Late', count: attendance.late, color: 'text-amber-500 bg-amber-500/10' },
      { label: 'Leave', count: attendance.leave || 0, color: 'text-purple-500 bg-purple-500/10' },
    ];
  };

  // Calendar parameters
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Attendance Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track daily attendance history and monthly summary reports</p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Report
        </button>
      </div>

      {/* Attendance Stats Cards */}
      {attendance && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-1 p-4 bg-primary text-white rounded-2xl flex flex-col justify-center text-center">
            <p className="text-2xl font-black">{attendance.overallPercentage}%</p>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-90 mt-0.5">Overall Attendance</p>
          </div>
          {getAttendanceSummary().map((stat, index) => (
            <div key={index} className="p-3 bg-card border border-border rounded-2xl text-center">
              <p className="text-lg font-black text-foreground">{stat.count}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <FilterBar
        filters={[
          { value: 'calendar', label: 'Calendar View' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'history', label: 'Logs History' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Calendar Grid View */}
      {tab === 'calendar' && attendance && (
        <Card>
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2 text-[9px] font-bold">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500" /> Present</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-rose-500" /> Absent</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-amber-500" /> Late</div>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const historyItem = attendance.history.find(h => h.date === dayStr);
              
              let style = 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400';
              if (historyItem?.status === 'Present') style = 'bg-emerald-500 text-white font-extrabold shadow-sm';
              if (historyItem?.status === 'Absent') style = 'bg-rose-500 text-white font-extrabold shadow-sm';
              if (historyItem?.status === 'Late') style = 'bg-amber-500 text-white font-extrabold shadow-sm';
              if (historyItem?.status === 'Leave') style = 'bg-purple-500 text-white font-extrabold shadow-sm';

              return (
                <div
                  key={day}
                  className={`h-10 rounded-xl flex items-center justify-center text-xs font-semibold ${style}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && attendance && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Monthly Attendance Trend</h3>
          <BarChartWidget
            data={attendance.analytics}
            xKey="month"
            bars={[{ key: 'percentage', label: 'Attendance %', color: '#4F46E5' }]}
            height={220}
          />
        </Card>
      )}

      {/* History List */}
      {tab === 'history' && attendance && (
        <div className="space-y-3">
          {attendance.history.map((record, index) => (
            <Card key={index} className="flex items-center justify-between p-4 border border-border">
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{record.remark || 'N/A'}</p>
              </div>
              <Badge variant={record.status === 'Present' ? 'success' : record.status === 'Absent' ? 'danger' : 'warning'}>
                {record.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
