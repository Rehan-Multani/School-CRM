import React, { useState } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_PROFILES } from '../data/mockData';
import { User, ShieldAlert, Phone, MapPin, Stethoscope, FileText, Download } from 'lucide-react';

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-border last:border-b-0">
    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:w-40 shrink-0">{label}</span>
    <span className="text-xs font-semibold text-foreground">{value || '—'}</span>
  </div>
);

export const StudentProfile = () => {
  const toast = useToast();
  const { selectedChildId, activeChildInfo } = useParentAuth();
  const profile = MOCK_CHILDREN_PROFILES[selectedChildId] || {};

  const handleDownload = (docName) => {
    toast.success(`Downloading: ${docName}`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Overview */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-foreground">{profile.name}</h1>
              <Badge variant="primary">Roll No. {profile.rollNo}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              {profile.class} - Section {profile.section} • Session {profile.academicSession}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student ID: {profile.id} • Admission No: {profile.admissionNo}</p>
          </div>
        </div>
      </Card>

      {/* Alert Info: Read Only */}
      <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-2xl text-xs font-medium">
        <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
        <span>Profile information is managed by school administration and is read-only. Contact the office for corrections.</span>
      </div>

      {/* Personal Info */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4 border-b border-border pb-3">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Personal Information</h3>
        </div>
        <InfoRow label="Full Name" value={profile.name} />
        <InfoRow label="Date of Birth" value={profile.dob} />
        <InfoRow label="Gender" value="Male" />
        <InfoRow label="Blood Group" value={profile.bloodGroup} />
        <InfoRow label="Registered Phone" value={profile.phone} />
        <InfoRow label="Registered Email" value={profile.email} />
        <InfoRow label="Residential Address" value={profile.address} />
      </Card>

      {/* Medical Info */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4 border-b border-border pb-3">
          <Stethoscope className="w-4 h-4 text-rose-500" />
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Medical Records</h3>
        </div>
        <InfoRow label="Known Allergies" value={profile.medical?.allergies} />
        <InfoRow label="Chronic Conditions" value={profile.medical?.conditions} />
        <InfoRow label="Prescribed Medications" value={profile.medical?.medications} />
      </Card>

      {/* Documents */}
      <Card>
        <div className="flex items-center gap-2.5 mb-4 border-b border-border pb-3">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Uploaded Documents</h3>
        </div>
        <div className="space-y-3">
          {profile.documents?.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 border border-border rounded-2xl hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{doc.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{doc.type} • {doc.size}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(doc.name)}
                className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all select-none shrink-0"
                aria-label={`Download ${doc.name}`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
