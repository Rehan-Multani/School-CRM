import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import {
  CalendarCheck, BookOpen, FileText, CreditCard, MessageSquare,
  FilePlus, Clock, ChevronRight, Sparkles, Users, User,
  Calendar, Megaphone, Trophy, GraduationCap
} from 'lucide-react';
import {
  MOCK_CHILDREN_PROFILES,
  MOCK_CHILDREN_ATTENDANCE,
  MOCK_CHILDREN_RESULTS,
  MOCK_CHILDREN_FEES,
  MOCK_CHILDREN_TIMETABLES,
  MOCK_DOWNLOADS
} from '../data/mockData';

export const ParentDashboard = () => {
  const navigate = useNavigate();
  const { user, selectedChildId, changeSelectedChild, activeChildInfo } = useParentAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // States loaded reactively from shared localStorage database
  const [childAttendance, setChildAttendance] = useState(null);
  const [childHomeworkCount, setChildHomeworkCount] = useState(0);
  const [childFees, setChildFees] = useState(null);
  const [childResult, setChildResult] = useState(null);

  useEffect(() => {
    if (!selectedChildId) return;

    // 1. Load Attendance
    const storedAttendance = localStorage.getItem('school_attendance');
    if (storedAttendance && selectedChildId === 'STU108902') {
      setChildAttendance(JSON.parse(storedAttendance));
    } else {
      setChildAttendance(MOCK_CHILDREN_ATTENDANCE[selectedChildId] || null);
    }

    // 2. Load Homework Count
    const storedHomework = localStorage.getItem('school_homework');
    if (storedHomework) {
      const list = JSON.parse(storedHomework);
      setChildHomeworkCount(list.filter(h => h.status === 'Pending').length);
    } else {
      setChildHomeworkCount(0);
    }

    // 3. Load Fees Details
    setChildFees(MOCK_CHILDREN_FEES[selectedChildId] || null);

    // 4. Load Results
    const storedResults = localStorage.getItem('school_results');
    if (storedResults && selectedChildId === 'STU108902') {
      setChildResult(JSON.parse(storedResults));
    } else {
      setChildResult(MOCK_CHILDREN_RESULTS[selectedChildId] || null);
    }
  }, [selectedChildId]);

  // Timetable
  const timetableSchedule = MOCK_CHILDREN_TIMETABLES[selectedChildId] || {};
  const todayClasses = timetableSchedule.monday || [];

  const quickActions = [
    { label: 'Switch Sibling', action: () => setShowSwitchModal(true), icon: Users, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Pay Fees', action: () => navigate('/parent/fees'), icon: CreditCard, color: 'text-rose-500 bg-rose-500/10' },
    { label: 'Child Profile', action: () => navigate('/parent/profile'), icon: User, color: 'text-sky-500 bg-sky-500/10' },
    { label: 'View Results', action: () => navigate('/parent/results'), icon: GraduationCap, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Message Teacher', action: () => navigate('/parent/messages'), icon: MessageSquare, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Apply Leave', action: () => navigate('/parent/leave'), icon: FilePlus, color: 'text-amber-500 bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Hero Profile Section ── */}
      <Card className="bg-gradient-to-br from-primary via-indigo-600 to-accent text-white border-none p-6 shadow-premium relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-secondary/20 rounded-full blur-2xl -mb-10" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={user?.photo}
            alt={user?.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/30 shadow-md shrink-0"
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-white/80 text-[10px] font-bold tracking-wider uppercase">Parent Account</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            </div>
            <h1 className="text-lg sm:text-xl font-black mt-0 mb-0 tracking-tight text-white">{user?.name}</h1>
            <p className="text-[11px] text-white/70 mt-1">{user?.occupation} • Linked Sibling Count: {user?.childrenCount || 0}</p>
            
            {activeChildInfo && (
              <span className="inline-flex items-center gap-1.5 mt-3 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[9px] font-black text-white uppercase tracking-wider">
                Viewing: {activeChildInfo.name} ({activeChildInfo.class})
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Sibling Stats Dashboard Row ── */}
      {activeChildInfo && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {activeChildInfo.name}'s Quick Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              title="Attendance %"
              value={childAttendance?.overallPercentage != null ? `${childAttendance.overallPercentage}%` : '0%'}
              subtext="Overall attendance"
              icon={CalendarCheck}
              colorClass="bg-indigo-500"
              onClick={() => navigate('/parent/attendance')}
            />
            <StatCard
              title="Pending Homework"
              value={childHomeworkCount === 0 ? '00' : `${childHomeworkCount}`}
              subtext="Assignments due"
              icon={BookOpen}
              colorClass="bg-amber-500"
              onClick={() => navigate('/parent/homework')}
            />
            <StatCard
              title="Outstanding Fees"
              value={`₹${childFees?.pendingFees ?? 0}`}
              subtext="Pending payment balance"
              icon={CreditCard}
              colorClass="bg-rose-500"
              onClick={() => navigate('/parent/fees')}
            />
            <StatCard
              title="Academic GPA"
              value={`${childResult?.gpa || '0.0'} GPA`}
              subtext={`Rank: ${childResult?.rank || 'N/A'}`}
              icon={GraduationCap}
              colorClass="bg-purple-500"
              onClick={() => navigate('/parent/results')}
            />
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={act.action}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-premium duration-150 group active:scale-95 select-none"
                id={`parent-quick-action-${i}`}
              >
                <div className={`p-2.5 rounded-xl ${act.color} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-center mt-2 leading-tight">
                  {act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Split Timetable & Circulars Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Timetable */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Class Schedule</h3>
            <button onClick={() => navigate('/parent/timetable')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>Timetable</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {todayClasses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No periods scheduled today</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-72 no-scrollbar">
              {todayClasses.map((cl, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight">{cl.subject}</h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{cl.teacher} · Room {cl.room}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant="info" className="text-[9px]">{cl.time}</Badge>
                    <span className="text-[9px] text-slate-400 font-bold block mt-1">Period {cl.period}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Circulars / Notice Board */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Circulars & Notices</h3>
            <button onClick={() => navigate('/parent/announcements')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center py-8">No Result — No circulars or notices</p>
          </div>
        </Card>
      </div>

      {/* Switch Sibling Dialog */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSwitchModal(false)} />
          <div className="relative bg-card w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Select Child</h3>
            <div className="space-y-2">
              {user?.linkedChildren.map(c => {
                const isActive = c.id === selectedChildId;
                return (
                  <button
                    key={c.id}
                    onClick={() => { changeSelectedChild(c.id); setShowSwitchModal(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isActive ? 'bg-primary/5 border-primary' : 'bg-slate-50/50 dark:bg-slate-900/50 border-border hover:border-primary/20'
                    }`}
                  >
                    <img src={c.photo} alt={c.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{c.class} - {c.section} • Roll #{c.rollNo}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSwitchModal(false)}
              className="w-full mt-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
