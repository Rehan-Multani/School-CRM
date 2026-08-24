import React, { useState } from 'react';
import { useTeacherAuth } from '../context/TeacherAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import {
  User, Briefcase, GraduationCap, Phone, FileText,
  Lock, Camera, Edit3, Check, X, Eye, EyeOff, Shield
} from 'lucide-react';

const TABS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'qualifications', label: 'Qualifications', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'password', label: 'Password', icon: Lock },
];

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-border last:border-b-0">
    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:w-40 shrink-0">{label}</span>
    <span className="text-xs font-semibold text-foreground">{value || '—'}</span>
  </div>
);

export const TeacherProfile = () => {
  const { user, updateProfile } = useTeacherAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setPwLoading(false);
    setPwForm({ current: '', newPw: '', confirm: '' });
    toast.success('Password changed successfully!');
  };

  const documents = [
    { name: 'Joining Letter', status: 'Available', date: '2019-07-01' },
    { name: 'Identity Card', status: 'Available', date: '2019-07-05' },
    { name: 'B.Ed. Certificate', status: 'Available', date: '2019-06-20' },
    { name: 'M.Sc. Certificate', status: 'Available', date: '2019-06-20' },
    { name: 'Experience Certificate (Previous)', status: 'Available', date: '2019-06-25' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Hero */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <img
              src={user?.photo}
              alt={user?.name}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
            />
            <button className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-white rounded-xl shadow-premium hover:bg-primary-hover transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-foreground">{user?.name}</h1>
              <Badge variant="primary">{user?.designation}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{user?.department} Department • {user?.employeeId}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {user?.subjects?.map(s => (
                <span key={s} className="text-[10px] font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 select-none shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-premium'
                  : 'bg-card border border-border text-slate-500 hover:border-primary/30 hover:text-primary'
              }`}
              id={`teacher-profile-tab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'personal' && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
          <InfoRow label="Full Name" value={user?.name} />
          <InfoRow label="Date of Birth" value={user?.dob} />
          <InfoRow label="Gender" value={user?.gender} />
          <InfoRow label="Blood Group" value={user?.bloodGroup} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone" value={user?.phone} />
          <InfoRow label="Address" value={user?.address} />
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Emergency Contact</h3>
            <InfoRow label="Name" value={user?.emergencyContact?.name} />
            <InfoRow label="Relation" value={user?.emergencyContact?.relation} />
            <InfoRow label="Phone" value={user?.emergencyContact?.phone} />
          </div>
        </Card>
      )}

      {activeTab === 'professional' && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Professional Details</h3>
          <InfoRow label="Employee ID" value={user?.employeeId} />
          <InfoRow label="Department" value={user?.department} />
          <InfoRow label="Designation" value={user?.designation} />
          <InfoRow label="Joining Date" value={user?.joiningDate} />
          <InfoRow label="Experience" value={user?.experience} />
          <InfoRow label="Class Teacher" value={user?.classTeacher || 'Not Assigned'} />
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assigned Classes</h3>
            <div className="flex flex-wrap gap-2">
              {user?.classes?.map(c => (
                <Badge key={c} variant="info">{c}</Badge>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {user?.subjects?.map(s => (
                <Badge key={s} variant="primary">{s}</Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'qualifications' && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Qualifications & Experience</h3>
          <InfoRow label="Qualification" value={user?.qualification} />
          <div className="mt-4 space-y-3">
            {[
              { degree: 'M.Sc. Mathematics', institution: 'Delhi University', year: '2010', grade: '8.5 CGPA' },
              { degree: 'B.Sc. Mathematics', institution: 'Delhi University', year: '2008', grade: '8.2 CGPA' },
              { degree: 'B.Ed.', institution: 'IGNOU', year: '2012', grade: 'First Division' },
            ].map((q, i) => (
              <div key={i} className="p-4 border border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{q.degree}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{q.institution}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="success">{q.year}</Badge>
                    <p className="text-[10px] text-slate-400 mt-1">{q.grade}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Official Documents</h3>
          <div className="space-y-3">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-border rounded-2xl hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{doc.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Issued: {doc.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">{doc.status}</Badge>
                  <button className="text-xs text-primary font-bold hover:underline">View</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Change Password</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Use a strong password with 8+ characters</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { id: 'current', label: 'Current Password', value: pwForm.current, show: showCurrentPw, toggle: () => setShowCurrentPw(p => !p) },
              { id: 'newPw', label: 'New Password', value: pwForm.newPw, show: showNewPw, toggle: () => setShowNewPw(p => !p) },
              { id: 'confirm', label: 'Confirm New Password', value: pwForm.confirm, show: showConfirmPw, toggle: () => setShowConfirmPw(p => !p) },
            ].map(field => (
              <div key={field.id}>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={field.show ? 'text' : 'password'}
                    required
                    value={field.value}
                    onChange={(e) => setPwForm(p => ({ ...p, [field.id]: e.target.value }))}
                    className="w-full px-4 py-3 pr-11 rounded-2xl border border-border bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
                    placeholder="••••••••"
                    id={`teacher-pw-${field.id}`}
                  />
                  <button
                    type="button"
                    onClick={field.toggle}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-70 text-white py-3 rounded-2xl text-sm font-bold shadow-premium transition-all active:scale-95 select-none mt-2"
              id="teacher-change-password-submit"
            >
              {pwLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><Check className="w-4 h-4" /> Update Password</>
              )}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
};
