import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Building,
  Contact,
  BadgeCent,
  ShieldCheck,
  Award,
  FileText,
  Clock,
  Download,
  AlertCircle,
  ExternalLink,
  Edit2,
  CalendarRange,
  DollarSign,
  Star,
  FolderOpen,
  CheckCircle2,
  XCircle,
  MapPin,
  HeartHandshake,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const [employee, setEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(false);

  const fetchEmployeeDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, balRes, leavesRes, payRes, revRes] = await Promise.all([
        hrApi.getEmployee(id),
        hrApi.leaveBalance(id).catch(() => null),
        hrApi.leaves({ employeeRefId: id }).catch(() => null),
        hrApi.payrolls({ employeeRefId: id }).catch(() => null),
        hrApi.reviews({ employeeRefId: id }).catch(() => null),
      ]);

      if (empRes?.success) {
        setEmployee(empRes.data);
      }
      if (balRes?.success) {
        setLeaveBalance(balRes.data);
      }
      if (leavesRes?.success) {
        setLeaves(leavesRes.data || []);
      }
      if (payRes?.success) {
        setPayrolls(payRes.data || []);
      }
      if (revRes?.success) {
        setReviews(revRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [fetchEmployeeDetails]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await hrApi.approveEmployee(id);
      showToast(`✓ ${employee.employeeType === 'TEACHER' ? 'Teacher' : 'Staff'} ${employee.name} approved & activated!`, 'success');
      setEmployee((prev) => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve employee', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt(`Please enter rejection reason for ${employee.name}:`, 'Administrative verification declined');
    if (reason === null) return;
    setProcessing(true);
    try {
      await hrApi.rejectEmployee(id, reason);
      showToast(`Registration for ${employee.name} rejected.`, 'info');
      setEmployee((prev) => ({ ...prev, status: 'REJECTED' }));
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject employee', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {error || 'Employee Profile Not Found'}
        </h3>
        <button
          onClick={() => navigate('/hr/employees')}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          ← Back to Employee Directory
        </button>
      </div>
    );
  }

  const isPending = employee.status === 'PENDING_APPROVAL' || employee.status === 'PENDING';
  const isActive = employee.status === 'ACTIVE' || employee.status === 'Active';
  const isRejected = employee.status === 'REJECTED';
  const isTeacher = employee.employeeType === 'TEACHER';

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <button
        onClick={() => navigate('/hr/employees')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Employee Directory</span>
      </button>

      {/* Admin Approval Notice Banner */}
      {isPending && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Awaiting Administrative Verification & Approval
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                This {isTeacher ? 'faculty' : 'staff'} member has been onboarded by HR and is pending School Admin activation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Activate</span>
            </button>
            <button
              onClick={handleReject}
              disabled={processing}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {employee.photo ? (
            <img
              src={employee.photo}
              alt={employee.name}
              className={`w-16 h-16 rounded-2xl object-cover border-2 shrink-0 ${
                isPending
                  ? 'border-amber-400'
                  : isActive
                  ? 'border-emerald-500'
                  : 'border-slate-300'
              }`}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-xl flex items-center justify-center border-2 border-indigo-500/40 shrink-0">
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md font-mono">
                {employee.employeeId}
              </span>
              {isPending ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Pending Admin Approval</span>
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <XCircle className="w-2.5 h-2.5" />
                  <span>Rejected</span>
                </span>
              ) : (
                <Badge variant={isActive ? 'success' : 'default'}>
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {employee.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
              {employee.designation || 'Staff'} • {employee.department || 'General'} • {isTeacher ? 'Teaching Faculty' : 'Non-Teaching Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/hr/employees/${employee.id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Profile Overview' },
          { id: 'banking', label: 'Salary & Banking' },
          { id: 'leaves', label: `Leaves (${leaves.length})` },
          { id: 'payroll', label: `Payroll Slips (${payrolls.length})` },
          { id: 'reviews', label: `Appraisals (${reviews.length})` },
          { id: 'documents', label: `Locker Documents (${employee.documents?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Personal & Contact Information
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Email Address</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Mobile Phone</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.phone || 'N/A'}</span>
              </div>
              {employee.alternatePhone && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Alternate Phone</span>
                  <span className="font-bold text-slate-900 dark:text-white">{employee.alternatePhone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Gender</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.gender || 'N/A'}</span>
              </div>
              {employee.dateOfBirth && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Date of Birth</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(employee.dateOfBirth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {employee.bloodGroup && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Blood Group</span>
                  <span className="font-bold text-slate-900 dark:text-white">{employee.bloodGroup}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Joining Date</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {employee.address?.addressLine && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Residential Address</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {[employee.address.addressLine, employee.address.city, employee.address.state, employee.address.pincode].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Institutional Placement & Specialization
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Staff Classification</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {isTeacher ? 'Teaching Faculty' : 'Non-Teaching Staff'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Department</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.department || 'General'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Designation</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.designation || 'Staff'}</span>
              </div>
              {employee.specialization && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Subject / Specialization</span>
                  <span className="font-bold text-slate-900 dark:text-white">{employee.specialization}</span>
                </div>
              )}
              {employee.qualification && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Highest Qualification</span>
                  <span className="font-bold text-slate-900 dark:text-white">{employee.qualification}</span>
                </div>
              )}
              {employee.experienceSummary && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                  <span className="text-slate-400">Experience Summary</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{employee.experienceSummary}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Emergency Contact Person</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {employee.emergencyContact?.name || 'Not Provided'}{' '}
                  {employee.emergencyContact?.phone ? `(${employee.emergencyContact.phone})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Banking */}
      {activeTab === 'banking' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Salary & Base Remuneration
            </h3>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Contracted Base Salary</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  ₹{Number(employee.basicSalary || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-slate-400">Per Month Fixed Gross</span>
              </div>
              <BadgeCent className="w-10 h-10 text-indigo-600/30 dark:text-indigo-400/30" />
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">PAN Card Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{employee.pan || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">UAN / PF Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{employee.uan || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Bank Account Details
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Account Holder Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.bankDetails?.accountName || employee.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Bank Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.bankDetails?.bankName || 'Not Set'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Account Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{employee.bankDetails?.accountNumber || 'Not Set'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">IFSC Code</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white uppercase">{employee.bankDetails?.ifscCode || 'Not Set'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                <span className="text-slate-400">Branch Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{employee.bankDetails?.branchName || 'Not Set'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Leaves */}
      {activeTab === 'leaves' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Leave History & Current Allotments
          </h3>
          {leaves.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No leave records registered for this employee yet.</p>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <div key={l.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{l.leaveType} Leave</span>
                    <span className="text-[11px] text-slate-400">{l.startDate} to {l.endDate} ({l.days} Days)</span>
                  </div>
                  <Badge variant={l.status === 'APPROVED' ? 'success' : l.status === 'PENDING' ? 'warning' : 'danger'}>
                    {l.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Payroll Slips */}
      {activeTab === 'payroll' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Issued Monthly Payslips
          </h3>
          {payrolls.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No payslips generated for this employee yet.</p>
          ) : (
            <div className="space-y-3">
              {payrolls.map((p) => (
                <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{p.payrollMonth}</span>
                    <span className="text-[11px] text-slate-400">Net Salary: ₹{Number(p.netSalary || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <Badge variant={p.paymentStatus === 'PAID' ? 'success' : 'default'}>
                    {p.paymentStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Appraisals */}
      {activeTab === 'reviews' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Performance Reviews & Appraisals
          </h3>
          {reviews.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No performance reviews recorded for this employee.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{r.reviewCycle || 'Annual Review'}</span>
                    <span className="text-[11px] text-slate-400">Rating: {r.overallRating || 5}/5</span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">{r.reviewDate || 'Recent'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Locker Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Verified Verification Documents
          </h3>
          {(!employee.documents || employee.documents.length === 0) ? (
            <p className="text-xs text-slate-400 text-center py-8">No uploaded identity cards or certificates in locker.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {employee.documents.map((doc, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{doc.name || `Document ${idx + 1}`}</span>
                      <span className="text-[10px] text-slate-400">{doc.type || 'Identity / Certificate'}</span>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ToastComponent />
    </div>
  );
};

export default EmployeeDetail;
