import React, { useState } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Lock, Edit2, FileText, CheckCircle, Upload } from 'lucide-react';

export const StudentProfile = () => {
  const { user, updateProfile } = useStudentAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable fields form states
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [guardianPhone, setGuardianPhone] = useState(user?.guardian?.phone || '');
  const [guardianEmail, setGuardianEmail] = useState(user?.guardian?.email || '');
  const [allergies, setAllergies] = useState(user?.medical?.allergies || '');
  
  const handleSave = (e) => {
    e.preventDefault();
    updateProfile({
      email,
      phone,
      guardian: {
        ...user.guardian,
        phone: guardianPhone,
        email: guardianEmail,
      },
      medical: {
        ...user.medical,
        allergies,
      }
    });
    setIsEditing(false);
  };

  const tabs = [
    { id: 'personal', name: 'Personal Details' },
    { id: 'guardian', name: 'Guardian Info' },
    { id: 'medical', name: 'Medical Info' },
    { id: 'documents', name: 'Documents' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <img 
              src={user?.photo} 
              alt={user?.name} 
              className="w-24 h-24 rounded-2xl object-cover border border-border"
            />
            <label className="absolute bottom-1 right-1 p-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg cursor-pointer shadow-lg active:scale-95 duration-100">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" className="hidden" onChange={() => alert('Photo updated successfully! (Mock)')} />
            </label>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-lg font-bold text-foreground leading-none">{user?.name}</h2>
            <span className="text-[11px] text-slate-400 font-bold tracking-wider uppercase mt-1 block">
              Admission No: {user?.admissionNo}
            </span>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <Badge variant="info">{user?.class} - {user?.section}</Badge>
              <Badge variant="secondary">Roll No: #{user?.rollNo}</Badge>
              <Badge variant="success">Session: {user?.academicSession}</Badge>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/20 hover:bg-primary/5 rounded-xl text-xs font-bold transition-all active:scale-95 select-none"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Contact Details'}</span>
          </button>
        </div>
      </Card>

      {/* Tabs list */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setIsEditing(false); }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors select-none ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-foreground'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Profile Detail Fields */}
      <Card className="p-6">
        <form onSubmit={handleSave}>
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Full Name</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.name} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Student ID</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.id} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Date of Birth</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.dob} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Blood Group</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.bloodGroup} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Email Address (Editable)
                </label>
                <input 
                  type="email" 
                  disabled={!isEditing} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-900 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Mobile Number (Editable)
                </label>
                <input 
                  type="text" 
                  disabled={!isEditing} 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-900 text-xs" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Home Address</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <textarea 
                  disabled 
                  rows={2}
                  value={user?.address} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs resize-none" 
                />
              </div>
            </div>
          )}

          {activeTab === 'guardian' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Guardian Name</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.guardian?.name} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Relation</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.guardian?.relation} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Guardian Mobile (Editable)
                </label>
                <input 
                  type="text" 
                  disabled={!isEditing} 
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-900 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Guardian Email (Editable)
                </label>
                <input 
                  type="email" 
                  disabled={!isEditing} 
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-900 text-xs" 
                />
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Known Allergies (Editable)
                </label>
                <input 
                  type="text" 
                  disabled={!isEditing} 
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-transparent disabled:bg-slate-50 dark:disabled:bg-slate-900 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Medical Conditions</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.medical?.conditions} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <span>Emergency Contact Detail</span>
                  <Lock className="w-3 h-3 text-slate-400" />
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.emergencyContact} 
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs" 
                />
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Student Photo', key: 'photo', uploaded: true },
                { name: 'Birth Certificate', key: 'birth_cert', uploaded: true },
                { name: 'Aadhaar Card', key: 'aadhaar', uploaded: true },
                { name: 'Transfer Certificate', key: 'transfer_cert', uploaded: false },
                { name: 'Previous Marksheets', key: 'marksheet', uploaded: true },
                { name: 'Medical Certificate', key: 'med_cert', uploaded: false }
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/20 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{doc.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {doc.uploaded ? 'Verified Document' : 'Pending Submission'}
                      </span>
                    </div>
                  </div>
                  {doc.uploaded ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-primary cursor-pointer active:scale-95 duration-100">
                      <Upload className="w-4 h-4" />
                      <input type="file" className="hidden" onChange={() => alert(`${doc.name} uploaded successfully! (Mock)`)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form Action buttons */}
          {isEditing && activeTab !== 'documents' && (
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-border hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-premium"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};
