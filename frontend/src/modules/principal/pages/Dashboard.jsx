import React, { useState } from 'react';
import { usePrincipalAuth } from '../context/PrincipalAuthContext';
import { usePrincipalNotifications } from '../context/PrincipalNotificationContext';
import { 
  Users, 
  UserCheck, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  IndianRupee, 
  AlertTriangle, 
  GraduationCap, 
  Calendar, 
  UserPlus, 
  CheckSquare, 
  Clock,
  ArrowRight,
  PlusCircle,
  Megaphone,
  Video,
  FileSpreadsheet
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { AreaChart } from '../components/ui/Charts/AreaChart';
import { BarChart } from '../components/ui/Charts/BarChart';
import { PieChart } from '../components/ui/Charts/PieChart';
import { LineChart } from '../components/ui/Charts/LineChart';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

import {
  STUDENT_ATTENDANCE_TREND,
  TEACHER_ATTENDANCE_TREND,
  ADMISSIONS_TREND,
  FEE_COLLECTION_TREND,
  EXAM_PERFORMANCE,
  CLASS_PERFORMANCE,
  DEPT_PERFORMANCE,
  GENDER_RATIO,
  MOCK_LEAVE_REQUESTS
} from '../utils/constants';

import { useAppStore } from '../../../shared/store/useAppStore';

export const Dashboard = () => {
  const { user } = usePrincipalAuth();
  const { notifications } = usePrincipalNotifications();
  const { showToast, ToastComponent } = useToast();
  const navigate = useNavigate();
  const { students = [], staff = [], admissions = [], exams = [], events = [], receipts = [], leaves: storeLeaves = [] } = useAppStore();

  // Quick Action Modal states
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Leave Requests state
  const [leaves, setLeaves] = useState(storeLeaves);

  const totalStudents = students.length;
  const totalTeachers = staff.filter(s => s.role?.toLowerCase() === 'teacher' || s.department !== 'Administration').length;
  const totalEmployees = staff.length;
  const totalReceiptsAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;

  const handleApproveLeave = (id, name) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Approved' } : l));
    showToast(`Leave request for ${name} approved successfully!`, 'success');
  };

  const handleRejectLeave = (id, name) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'Rejected' } : l));
    showToast(`Leave request for ${name} has been rejected.`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Principal Welcome Section */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img 
            src={user?.photo} 
            alt={user?.name} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shrink-0" 
          />
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
              Principal Operations Center
            </span>
            <h2 className="text-lg md:text-xl font-black mt-0.5">Welcome, {user?.name}</h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">{user?.schoolName} • Academic Session {user?.academicSession}</p>
          </div>
        </div>
        <div className="text-left md:text-right md:border-l md:border-slate-800 md:pl-6">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">System Date</span>
          <span className="text-xs font-bold text-slate-300 mt-1 block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Quick Executive Actions</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button 
            onClick={() => navigate('/principal/leave')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-extrabold transition-all text-left"
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>Approve Leaves</span>
          </button>
          <button 
            onClick={() => navigate('/principal/reports')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 text-slate-655 dark:text-slate-350 rounded-2xl text-xs font-extrabold transition-all text-left border"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>View Reports</span>
          </button>
          <button 
            onClick={() => setShowAnnounceModal(true)} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 text-slate-655 dark:text-slate-350 rounded-2xl text-xs font-extrabold transition-all text-left border"
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Create Circular</span>
          </button>
          <button 
            onClick={() => setShowMeetingModal(true)} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 text-slate-655 dark:text-slate-350 rounded-2xl text-xs font-extrabold transition-all text-left border"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Schedule Meeting</span>
          </button>
          <button 
            onClick={() => navigate('/principal/communication')} 
            className="flex items-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 text-slate-655 dark:text-slate-350 rounded-2xl text-xs font-extrabold transition-all text-left border"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Message Staff</span>
          </button>
        </div>
      </div>

      {/* 12 Statistics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={totalStudents === 0 ? "00" : totalStudents.toLocaleString()} subtitle="active registrations" icon={Users} />
        <StatCard title="Total Teachers" value={totalTeachers === 0 ? "00" : totalTeachers.toLocaleString()} subtitle="allocated academic staff" icon={UserCheck} />
        <StatCard title="Total Employees" value={totalEmployees === 0 ? "00" : totalEmployees.toLocaleString()} subtitle="support & administrative" icon={Briefcase} />
        <StatCard title="Today's Attendance %" value={totalStudents > 0 ? "95%" : "0%"} subtitle="average roll-call today" icon={TrendingUp} />

        <StatCard title="Present Students" value={totalStudents === 0 ? "00" : totalStudents.toLocaleString()} subtitle="active students" icon={Users} />
        <StatCard title="Present Staff Today" value={totalEmployees === 0 ? "00" : totalEmployees.toLocaleString()} subtitle="active staff" icon={UserCheck} />
        <StatCard title="Fee Collection (Month)" value={`₹${totalReceiptsAmount.toLocaleString()}`} subtitle="received this month" icon={IndianRupee} />
        <StatCard title="Pending Tuition Fees" value="₹0" subtitle="across all classes" icon={AlertTriangle} />

        <StatCard title="Upcoming Exams" value={`${exams.length} Scheduled`} subtitle="midterm tests" icon={GraduationCap} />
        <StatCard title="Upcoming Events" value={`${events.length} Upcoming`} subtitle="campus activities" icon={Calendar} />
        <StatCard title="Recent Admissions" value={`${admissions.length} Active`} subtitle="approved applications" icon={UserPlus} />
        <StatCard title="Leaves Pending" value={pendingLeavesCount} subtitle="requires principal signature" icon={CheckSquare} />
      </div>

      {/* Charts Grid - 8 Interactive Recharts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Student Attendance Trend (Weekly)</span>
          <AreaChart data={STUDENT_ATTENDANCE_TREND} dataKey="attendance" xKey="month" height={220} color="#059669" />
        </div>

        {/* Chart 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Teacher Attendance Trend (Weekly)</span>
          <LineChart data={TEACHER_ATTENDANCE_TREND} dataKey="attendance" xKey="month" height={220} color="#10b981" />
        </div>

        {/* Chart 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Admissions Flow Trend</span>
          <BarChart data={ADMISSIONS_TREND} dataKey="admissions" xKey="month" height={220} color="#34d399" />
        </div>

        {/* Chart 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Fee Collection Progress (INR)</span>
          <AreaChart data={FEE_COLLECTION_TREND} dataKey="collected" xKey="month" height={220} color="#059669" />
        </div>

        {/* Chart 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Exam Averages Tracker (Term-wise)</span>
          <LineChart data={EXAM_PERFORMANCE} dataKey="average" xKey="name" height={220} color="#059669" />
        </div>

        {/* Chart 6 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Class-wise Performance Index (%)</span>
          <BarChart data={CLASS_PERFORMANCE} dataKey="avg" xKey="name" height={220} color="#059669" />
        </div>

        {/* Chart 7 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Department-wise Score Performance</span>
          <BarChart data={DEPT_PERFORMANCE} dataKey="score" xKey="name" height={220} color="#10b981" />
        </div>

        {/* Chart 8 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">School Gender Diversity Ratio</span>
          <div className="flex-1 flex items-center justify-center">
            <PieChart data={GENDER_RATIO} height={200} colors={["#059669", "#6ee7b7"]} />
          </div>
        </div>
      </div>

      {/* Leave request feed & alerts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaves Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">Leave Requests Pending Signature</h4>
            <button onClick={() => navigate('/principal/leave')} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-850/50 space-y-3.5">
            {leaves.filter(l => l.status === 'Pending').slice(0, 3).map((l) => (
              <div key={l.id} className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{l.staffName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">{l.role}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{l.dates} ({l.days} days) • "{l.reason}"</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button 
                    onClick={() => handleRejectLeave(l.id, l.staffName)} 
                    className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 rounded-lg"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => handleApproveLeave(l.id, l.staffName)} 
                    className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
            {leaves.filter(l => l.status === 'Pending').length === 0 && (
              <p className="text-center py-6 text-xs text-slate-400">All pending leave requests approved.</p>
            )}
          </div>
        </div>

        {/* Live Alerts feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <h4 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">Operational Notification Log</h4>
          </div>
          <div className="space-y-4 max-h-68 overflow-y-auto no-scrollbar">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-2.5 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                <div>
                  <span className="font-bold text-slate-905 dark:text-white block">{n.title}</span>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Announcement Modals */}
      <Modal isOpen={showAnnounceModal} onClose={() => setShowAnnounceModal(false)} title="Create New Announcement">
        <form onSubmit={(e) => {
          e.preventDefault();
          setShowAnnounceModal(false);
          showToast('Announcement posted to all parent & teacher feeds!', 'success');
        }} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1">
            <label>Announcement Category</label>
            <select className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none">
              <option>Academic Circular</option>
              <option>Emergency Notice</option>
              <option>Holiday Notice</option>
            </select>
          </div>
          <div className="space-y-1">
            <label>Target Audience</label>
            <select className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none">
              <option>All Parents & Teachers</option>
              <option>Only Teachers</option>
              <option>Only Parents</option>
            </select>
          </div>
          <div className="space-y-1">
            <label>Title Headline</label>
            <input type="text" placeholder="Enter headline notice..." required className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label>Detail Message Description</label>
            <textarea rows={3} placeholder="Compose details here..." required className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
            Broadcast Announcement
          </button>
        </form>
      </Modal>

      {/* Meeting Modal */}
      <Modal isOpen={showMeetingModal} onClose={() => setShowMeetingModal(false)} title="Schedule Meeting">
        <form onSubmit={(e) => {
          e.preventDefault();
          setShowMeetingModal(false);
          showToast('Meeting scheduled and invitations sent to calendars!', 'success');
        }} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1">
            <label>Meeting Title Agenda</label>
            <input type="text" placeholder="e.g. Science Syllabus Catchup..." required className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Meeting Date</label>
              <input type="date" required className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label>Time</label>
              <input type="time" required className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label>Participant Target</label>
            <select className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none">
              <option>Science Department</option>
              <option>All Academic Staff</option>
              <option>Class 10 & 12 Parents</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
            Schedule and Invite
          </button>
        </form>
      </Modal>

      <ToastComponent />
    </div>
  );
};
export default Dashboard;
