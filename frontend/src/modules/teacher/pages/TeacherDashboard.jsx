import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '../context/TeacherAuthContext';
import { useTeacherNotifications } from '../context/TeacherNotificationContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import {
  CalendarCheck, BookOpen, FileText, BarChart2, Bell, MessageSquare,
  ClipboardList, FilePlus, Upload, Clock, ChevronRight, Sparkles,
  Users, GraduationCap, BookMarked, Calendar
} from 'lucide-react';
import {
  mockTimetable, mockHomework, mockExams, mockAnnouncements, mockEvents
} from '../data/mockData';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useTeacherAuth();
  const { notifications, unreadNotifCount, unreadMsgCount } = useTeacherNotifications();

  const todayKey = DAY_KEYS[new Date().getDay()];
  const todayClasses = mockTimetable[todayKey] || mockTimetable.monday;

  const pendingHomework = mockHomework.filter(h => h.status === 'Active').reduce((s, h) => s + (h.submitted - h.evaluated), 0);
  const pendingMarks = mockExams.length;
  const upcomingExams = mockExams.filter(e => new Date(e.date) > new Date()).slice(0, 3);
  const recentAnnouncements = mockAnnouncements.slice(0, 3);
  const upcomingEvents = mockEvents.slice(0, 2);

  const quickActions = [
    { label: 'Mark Attendance', path: '/teacher/attendance', icon: CalendarCheck, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Create Homework', path: '/teacher/homework', icon: BookOpen, color: 'text-amber-500 bg-amber-500/10' },
    { label: 'Upload Marks', path: '/teacher/examination', icon: Upload, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'View Timetable', path: '/teacher/timetable', icon: Calendar, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Message Parents', path: '/teacher/messages', icon: MessageSquare, color: 'text-sky-500 bg-sky-500/10' },
    { label: 'Apply Leave', path: '/teacher/leave', icon: FilePlus, color: 'text-rose-500 bg-rose-500/10' },
  ];

  const examTypeColor = { 'Unit Test': 'primary', 'Mid Term': 'warning', 'Final': 'danger' };

  return (
    <div className="space-y-6">
      {/* ── Hero Teacher Card ── */}
      <Card className="bg-gradient-to-br from-primary via-indigo-600 to-accent text-white border-none p-6 shadow-premium relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-secondary/20 rounded-full blur-2xl -mb-10" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={user?.photo}
            alt={user?.name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">Welcome Back</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-0 mb-0 tracking-tight text-white">{user?.name}</h1>
            {user?.classTeacher && (
              <span className="inline-flex items-center gap-1.5 mt-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-bold text-white">
                <Users className="w-3 h-3" /> Class Teacher: {user.classTeacher}
              </span>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-white/10 text-white/90 text-xs font-medium">
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Employee ID</span>
                <span className="mt-0.5 block">{user?.employeeId}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Department</span>
                <span className="mt-0.5 block">{user?.department}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Designation</span>
                <span className="mt-0.5 block">{user?.designation}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Subjects</span>
                <span className="mt-0.5 block">{user?.subjects?.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Quick Stats ── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Today's Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Today's Classes" value={todayClasses.length === 0 ? '00' : `${todayClasses.length}`} subtext="Scheduled periods" icon={Clock} colorClass="bg-indigo-500" onClick={() => navigate('/teacher/timetable')} />
          <StatCard title="Pending Eval." value={pendingHomework === 0 ? '00' : `${pendingHomework}`} subtext="Submissions awaiting" icon={BookOpen} colorClass="bg-amber-500" onClick={() => navigate('/teacher/homework')} />
          <StatCard title="Marks Pending" value={pendingMarks === 0 ? '00' : `${pendingMarks}`} subtext="Exams to evaluate" icon={Upload} colorClass="bg-purple-500" onClick={() => navigate('/teacher/examination')} />
          <StatCard title="Unread Messages" value={unreadMsgCount === 0 ? '00' : `${unreadMsgCount}`} subtext="From parents & staff" icon={MessageSquare} colorClass="bg-sky-500" onClick={() => navigate('/teacher/messages')} />
          <StatCard title="Notifications" value={unreadNotifCount === 0 ? '00' : `${unreadNotifCount}`} subtext="Unread alerts" icon={Bell} colorClass="bg-rose-500" onClick={() => navigate('/teacher/notifications')} />
          <StatCard title="Upcoming Exams" value={upcomingExams.length === 0 ? '00' : `${upcomingExams.length}`} subtext="Next 30 days" icon={FileText} colorClass="bg-emerald-500" onClick={() => navigate('/teacher/examination')} />
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(act.path)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-premium duration-150 group active:scale-95 select-none"
                id={`teacher-quick-action-${i}`}
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

      {/* ── Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Timetable */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Timetable</h3>
            <button onClick={() => navigate('/teacher/timetable')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>Full Schedule</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {todayClasses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No classes scheduled today</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-72 no-scrollbar">
              {todayClasses.map((cl, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight">{cl.subject}</h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{cl.class} • Room {cl.room}</span>
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

        {/* Upcoming Exams */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Exams</h3>
            <button onClick={() => navigate('/teacher/examination')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No exams scheduled</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-72 no-scrollbar">
              {upcomingExams.map(exam => (
                <div key={exam.id} className="p-3.5 rounded-xl border border-border hover:border-primary/20 duration-150">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant={examTypeColor[exam.type] || 'default'} className="text-[8px]">{exam.type}</Badge>
                    <span className="text-[9px] text-slate-400 font-medium">{exam.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{exam.subject}</h4>
                  <span className="text-[10px] text-slate-400">{exam.class} • {exam.time} • {exam.venue}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Announcements */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Announcements</h3>
            <button onClick={() => navigate('/teacher/announcements')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentAnnouncements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No announcements posted</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-72 no-scrollbar">
              {recentAnnouncements.map(ann => (
                <div key={ann.id} className={`p-3.5 rounded-xl border duration-150 ${ann.isUrgent ? 'border-rose-200 dark:border-rose-900 bg-rose-500/5' : 'border-border hover:border-primary/20'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge
                      variant={ann.isUrgent ? 'danger' : ann.type === 'Exam' ? 'warning' : ann.type === 'Holiday' ? 'success' : 'info'}
                      className="text-[8px] tracking-wide uppercase"
                    >
                      {ann.isUrgent ? '🚨 Urgent' : ann.type}
                    </Badge>
                    <span className="text-[9px] text-slate-400 font-medium">{ann.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">{ann.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{ann.body}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Upcoming Events ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Events & Duties</h3>
          <button onClick={() => navigate('/teacher/events')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No Result — No upcoming events scheduled</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upcomingEvents.map(ev => (
              <Card key={ev.id} className="flex gap-4" onClick={() => navigate('/teacher/events')}>
                <div className="shrink-0 text-center">
                  <div className="w-12 h-14 bg-primary/10 rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-primary uppercase">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-lg font-black text-primary leading-none">{new Date(ev.date).getDate()}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground leading-tight mb-0.5">{ev.title}</h4>
                  <p className="text-[10px] text-slate-400 mb-1.5">{ev.venue} • {ev.time}</p>
                  {ev.duty && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                      <ClipboardList className="w-3 h-3" /> {ev.duty}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default TeacherDashboard;
