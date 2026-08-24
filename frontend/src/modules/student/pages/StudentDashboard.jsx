import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useStudentNotifications } from '../context/NotificationContext';
import { 
  useAttendance, 
  useHomework, 
  useExams, 
  useResults, 
  useFees, 
  useTimetable, 
  useTransport, 
  useHostel, 
  useAnnouncements 
} from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { 
  CalendarCheck, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  CreditCard, 
  Calendar, 
  Truck, 
  Home, 
  Bell, 
  Download, 
  UserCheck, 
  FilePlus, 
  MessageSquare,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  const { notifications } = useStudentNotifications();
  
  const { data: attendance } = useAttendance();
  const { homeworkList } = useHomework();
  const { exams } = useExams();
  const { results } = useResults();
  const { fees } = useFees();
  const { timetable } = useTimetable();
  const { transport } = useTransport();
  const { hostel } = useHostel();
  const { announcements } = useAnnouncements();

  // Compute calculated metrics
  const pendingHwCount = homeworkList.filter(h => h.status === 'Pending').length;
  const submittedHwCount = homeworkList.filter(h => h.status === 'Submitted').length;
  const recentNotifications = notifications.slice(0, 3);
  const todayAnnouncements = announcements.slice(0, 2);

  // Today's Timetable Day calculation (mocked to Monday for preview)
  const todayClasses = timetable.monday || [];

  const handleQuickAction = (path) => {
    navigate(path);
  };

  return (
    <div className="space-y-6">
      {/* 1. Greeting and Student Card Info Header */}
      <Card className="bg-gradient-to-br from-primary via-indigo-600 to-accent text-white border-none p-6 shadow-premium relative overflow-hidden">
        {/* Abstract background blur circles */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute left-1/3 bottom-0 w-36 h-36 bg-secondary/20 rounded-full blur-2xl -mb-10"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img 
            src={user?.photo} 
            alt={user?.name} 
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">Welcome Back</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 mb-1 tracking-tight text-white">{user?.name}</h1>
            
            {/* Student ID Grid Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-white/10 text-white/90 text-xs font-medium">
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Student ID</span>
                <span className="mt-0.5 block">{user?.id}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Admission No</span>
                <span className="mt-0.5 block">{user?.admissionNo}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Class / Section</span>
                <span className="mt-0.5 block">{user?.class} - {user?.section}</span>
              </div>
              <div>
                <span className="text-white/60 text-[10px] block uppercase font-bold tracking-wider">Roll No & Session</span>
                <span className="mt-0.5 block">#{user?.rollNo} ({user?.academicSession})</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Quick Stats Grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard 
            title="Today's Attendance" 
            value={attendance?.todayStatus || "Not Marked"} 
            subtext="Status"
            icon={UserCheck} 
            colorClass="bg-emerald-500"
            onClick={() => navigate('/student/attendance')}
          />
          <StatCard 
            title="Overall Attendance" 
            value={`${attendance?.overallPercentage ?? 0}%`}
            subtext="Attendance rate"
            icon={CalendarCheck} 
            colorClass="bg-indigo-500"
            onClick={() => navigate('/student/attendance')}
          />
          <StatCard 
            title="Homework Pending" 
            value={`${pendingHwCount === 0 ? '00' : pendingHwCount} items`}
            subtext={`${submittedHwCount} completed`}
            icon={BookOpen} 
            colorClass="bg-amber-500"
            onClick={() => navigate('/student/homework')}
          />
          <StatCard 
            title="Upcoming Exams" 
            value={`${(Array.isArray(exams) ? exams[0]?.schedule : exams?.schedule)?.length || 0} Subjects`}
            subtext="Exam schedule"
            icon={FileText} 
            colorClass="bg-purple-500"
            onClick={() => navigate('/student/exams')}
          />
          <StatCard 
            title="Latest Result" 
            value={`CGPA: ${results?.gpa || '0.0'}`}
            subtext={results?.rank || 'Rank'}
            icon={GraduationCap} 
            colorClass="bg-cyan-500"
            onClick={() => navigate('/student/results')}
          />
          <StatCard 
            title="Pending Fees" 
            value={`₹${fees?.pendingFees ?? 0}`}
            subtext="Fee balance"
            icon={CreditCard} 
            colorClass="bg-rose-500"
            onClick={() => navigate('/student/fees')}
          />
          <StatCard 
            title="Transport Status" 
            value={transport?.vehicleNo || "Not Assigned"} 
            subtext={transport?.pickupPoint || "Transport"}
            icon={Truck} 
            colorClass="bg-sky-500"
            onClick={() => navigate('/student/transport')}
          />
          <StatCard 
            title="Hostel Room" 
            value={hostel?.roomNo || hostel?.roomNumber || "Not Assigned"} 
            subtext={hostel?.building || "Hostel"}
            icon={Home} 
            colorClass="bg-teal-500"
            onClick={() => navigate('/student/hostel')}
          />
        </div>
      </div>

      {/* 3. Quick Actions Row */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            { label: 'View Attendance', path: '/student/attendance', icon: CalendarCheck, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'Submit Homework', path: '/student/homework', icon: BookOpen, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'View Timetable', path: '/student/timetable', icon: Calendar, color: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'Pay Fees', path: '/student/fees', icon: CreditCard, color: 'text-rose-500 bg-rose-500/10' },
            { label: 'View Results', path: '/student/results', icon: GraduationCap, color: 'text-cyan-500 bg-cyan-500/10' },
            { label: 'Download ID', path: '/student/downloads', icon: Download, color: 'text-blue-500 bg-blue-500/10' },
            { label: 'Contact Teacher', path: '/student/messages', icon: MessageSquare, color: 'text-violet-500 bg-violet-500/10' },
            { label: 'Apply Leave', path: '/student/leave', icon: FilePlus, color: 'text-teal-500 bg-teal-500/10' },
          ].map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={() => handleQuickAction(act.path)}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-premium duration-150 group active:scale-95 select-none"
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

      {/* 4. Split Layout sections (Timetable, Announcements, Notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Timetable */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Timetable</h3>
            <button onClick={() => navigate('/student/timetable')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>Full Schedule</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {todayClasses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No classes scheduled today</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] no-scrollbar">
              {todayClasses.map((cl, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight">{cl.subject}</h4>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{cl.teacher} • Room {cl.room}</span>
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

        {/* Announcements */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Announcements</h3>
            <button onClick={() => navigate('/student/announcements')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {todayAnnouncements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No announcements posted</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] no-scrollbar">
              {todayAnnouncements.map((ann) => (
                <div key={ann.id} className="p-3.5 rounded-xl border border-border hover:border-primary/20 duration-150">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant={ann.category === 'Exam' ? 'danger' : 'info'} className="text-[8px] tracking-wide uppercase">
                      {ann.category}
                    </Badge>
                    <span className="text-[9px] text-slate-400 font-medium">{ann.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">{ann.title}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications</h3>
            <button onClick={() => navigate('/student/notifications')} className="text-primary text-[10px] font-bold hover:underline flex items-center">
              <span>All Alerts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No Result — No notifications</p>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] no-scrollbar">
              {recentNotifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate leading-none">{notif.title}</h4>
                      {!notif.read && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></span>}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
};
export default StudentDashboard;
