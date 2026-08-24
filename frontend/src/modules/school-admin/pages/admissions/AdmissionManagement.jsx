import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { 
  Check, 
  X, 
  Eye, 
  FileCheck, 
  UserPlus, 
  IdCard, 
  Download, 
  AlertTriangle,
  Printer
} from 'lucide-react';

export const AdmissionManagement = () => {
  const [activeTab, setActiveTab] = useState('review');
  const { showToast, ToastComponent } = useToast();
  const { store, approveAdmission, updateStore } = useAppStore();

  const admissions = store.admissions || [];
  const [selectedAdm, setSelectedAdm] = useState(null);
  
  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);

  const [offlineForm, setOfflineForm] = useState({
    name: '',
    gender: 'Male',
    dob: '2012-05-15',
    class: '10',
    section: 'A',
    parentName: '',
    phone: '',
    email: '',
    address: 'New Delhi'
  });

  // Stats
  const pendingCount = admissions.filter(a => a.status === 'Pending Review').length;
  const waitingCount = admissions.filter(a => a.status === 'Waiting List').length;
  const approvedCount = admissions.filter(a => a.status === 'Approved').length;

  const handleUpdateStatus = (id, nextStatus) => {
    if (nextStatus === 'Approved') {
      const student = approveAdmission(id, selectedAdm?.class || '10', 'A', 'Vikramaditya (Admin)');
      showToast(`Admission approved! Generated Student ID: ${student?.id} & Admission No: ${student?.admissionNo}. Profile propagated to all school modules.`, 'success');
    } else {
      updateStore(prev => ({
        ...prev,
        admissions: prev.admissions.map(a => a.id === id ? { ...a, status: nextStatus } : a)
      }), 'ADMISSION_STATUS_UPDATED', { id, nextStatus });
      showToast(`Candidate application moved to ${nextStatus}`, nextStatus === 'Rejected' ? 'warning' : 'info');
    }
    setReviewModalOpen(false);
  };

  const handleOfflineSubmit = (e) => {
    e.preventDefault();
    const newAdmId = `ADM-OFF-${Date.now().toString().slice(-4)}`;
    const newAdmObj = {
      id: newAdmId,
      name: offlineForm.name,
      gender: offlineForm.gender,
      dob: offlineForm.dob,
      class: offlineForm.class,
      section: offlineForm.section,
      parentName: offlineForm.parentName,
      phone: offlineForm.phone,
      email: offlineForm.email || `${offlineForm.name.toLowerCase().replace(/\s+/g, '.')}@greenfield.edu`,
      address: offlineForm.address,
      documentsStatus: 'Verified',
      status: 'Pending Review',
      appliedDate: new Date().toISOString().split('T')[0],
      previousSchool: 'Transfer Student',
      category: 'General'
    };

    updateStore(prev => ({
      ...prev,
      admissions: [newAdmObj, ...prev.admissions]
    }), 'OFFLINE_ADMISSION_REGISTERED');

    // Auto approve offline candidate
    const student = approveAdmission(newAdmId, offlineForm.class, offlineForm.section, 'Vikramaditya (Admin)');
    setOfflineModalOpen(false);
    showToast(`Offline candidate admitted directly! Student ID: ${student?.id}`, 'success');
  };

  const reviewColumns = [
    { header: 'Applicant Name', key: 'name' },
    { header: 'Target Class', key: 'class', render: (val) => `Class ${val}` },
    { header: 'Guardian', key: 'parentName' },
    { header: 'Docs Verified', key: 'documentsStatus', render: (val) => (
      <Badge variant={val === 'Verified' ? 'success' : val === 'Rejected' ? 'danger' : 'warning'}>
        {val || 'Pending'}
      </Badge>
    )},
    { header: 'Application Status', key: 'status', render: (val) => (
      <Badge variant={val === 'Approved' ? 'success' : val === 'Rejected' ? 'danger' : val === 'Waiting List' ? 'warning' : 'info'}>
        {val}
      </Badge>
    )},
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedAdm(row);
              setReviewModalOpen(true);
            }}
            className="flex items-center gap-1 text-xs font-bold text-indigo-650 hover:underline"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
          
          {row.status === 'Approved' && (
            <button
              onClick={() => {
                setSelectedAdm(row);
                setIdCardModalOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-bold text-emerald-650 hover:underline"
            >
              <IdCard className="w-3.5 h-3.5" />
              <span>ID Card</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Admission Management" 
        subtitle="Manage prospective candidate profiles, document validations, waitlists, and admission approvals."
        actions={
          <button
            onClick={() => setOfflineModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Offline Admission</span>
          </button>
        }
      />

      <Tabs
        tabs={[
          { id: 'review', label: 'Pending Review', count: pendingCount },
          { id: 'waiting', label: 'Waiting List', count: waitingCount },
          { id: 'approved', label: 'Approved Students', count: approvedCount },
          { id: 'all', label: 'All Registrations', count: admissions.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <DataTable
          columns={reviewColumns}
          data={
            activeTab === 'review' ? admissions.filter(a => a.status === 'Pending Review') :
            activeTab === 'waiting' ? admissions.filter(a => a.status === 'Waiting List') :
            activeTab === 'approved' ? admissions.filter(a => a.status === 'Approved') :
            admissions
          }
          searchPlaceholder="Search candidates..."
        />
      </div>

      {/* REVIEW APPLICATION MODAL */}
      <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Verify Candidate Admission Details">
        {selectedAdm && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-850">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Candidate Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{selectedAdm.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Target Class</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">Class {selectedAdm.class}</span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Birth Date</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedAdm.dob}</span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Gender</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedAdm.gender}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-450 uppercase block">Guardian Contacts</span>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-3.5 border rounded-xl text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-slate-450 block">Name</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">{selectedAdm.parentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block">Phone</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">{selectedAdm.phone}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-455 uppercase block">Uploaded Documents Status</span>
              <div className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  <span>Transfer Certificate, Birth Certificate, Aadhaar Proof</span>
                </div>
                <Badge variant={selectedAdm.documentsStatus === 'Verified' ? 'success' : 'warning'}>
                  {selectedAdm.documentsStatus || 'Pending'}
                </Badge>
              </div>
            </div>

            {selectedAdm.status === 'Pending Review' && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleUpdateStatus(selectedAdm.id, 'Rejected')}
                  className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all"
                >
                  Reject Candidate
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedAdm.id, 'Waiting List')}
                    className="px-4 py-2 border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                  >
                    Move to Waitlist
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAdm.id, 'Approved')}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Approve Admission & Create Record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* OFFLINE ADMISSION MODAL */}
      <Modal isOpen={offlineModalOpen} onClose={() => setOfflineModalOpen(false)} title="Register Offline Student Admission">
        <form onSubmit={handleOfflineSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Candidate Full Name *</label>
              <input
                type="text"
                required
                value={offlineForm.name}
                onChange={(e) => setOfflineForm({ ...offlineForm, name: e.target.value })}
                placeholder="e.g. Siddharth Verma"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</label>
              <select
                value={offlineForm.gender}
                onChange={(e) => setOfflineForm({ ...offlineForm, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class *</label>
              <select
                value={offlineForm.class}
                onChange={(e) => setOfflineForm({ ...offlineForm, class: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                {['6', '7', '8', '9', '10', '11', '12'].map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Section</label>
              <select
                value={offlineForm.section}
                onChange={(e) => setOfflineForm({ ...offlineForm, section: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date of Birth</label>
              <input
                type="date"
                value={offlineForm.dob}
                onChange={(e) => setOfflineForm({ ...offlineForm, dob: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Parent / Guardian Name *</label>
              <input
                type="text"
                required
                value={offlineForm.parentName}
                onChange={(e) => setOfflineForm({ ...offlineForm, parentName: e.target.value })}
                placeholder="e.g. Ramesh Verma"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Contact Phone *</label>
              <input
                type="tel"
                required
                value={offlineForm.phone}
                onChange={(e) => setOfflineForm({ ...offlineForm, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
          >
            Admit Student & Generate Official Credentials
          </button>
        </form>
      </Modal>

      {/* ID CARD MODAL */}
      <Modal isOpen={idCardModalOpen} onClose={() => setIdCardModalOpen(false)} title="Student ID Card Preview">
        {selectedAdm && (
          <div className="flex flex-col items-center py-4 space-y-6">
            <div className="w-80 h-[460px] bg-slate-950 border border-slate-800 text-white rounded-3xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-between p-6">
              <div className="absolute top-0 inset-x-0 h-4 bg-indigo-600"></div>

              <div className="text-center mt-3">
                <h2 className="text-base font-black tracking-tight leading-none text-white">Greenfield Public School</h2>
                <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest mt-1 block">Official Student Identity Card</span>
              </div>

              <div className="w-28 h-28 rounded-2xl border-4 border-slate-800 overflow-hidden bg-slate-900">
                <img 
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80" 
                  alt="Student Photo" 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-white leading-none">{selectedAdm.name}</h3>
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide">Class {selectedAdm.class} - A</span>
              </div>

              <div className="w-full border-t border-slate-800 pt-3 space-y-2 text-left text-[11px] font-semibold text-slate-400">
                <div className="flex justify-between">
                  <span>Admission No:</span>
                  <span className="text-white font-bold">{selectedAdm.admissionNo || `ADM-2026-${selectedAdm.id.slice(-4)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guardian:</span>
                  <span className="text-white font-bold">{selectedAdm.parentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emergency:</span>
                  <span className="text-white font-bold">{selectedAdm.phone}</span>
                </div>
              </div>

              <div className="flex gap-0.5 justify-center w-full mt-1 h-6 opacity-75">
                {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 4, 2, 1, 2, 3, 1, 4].map((width, idx) => (
                  <div key={idx} className="bg-white shrink-0" style={{ width: `${width}px` }}></div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official ID Badge</span>
            </button>
          </div>
        )}
      </Modal>

      <ToastComponent />
    </div>
  );
};
export default AdmissionManagement;
