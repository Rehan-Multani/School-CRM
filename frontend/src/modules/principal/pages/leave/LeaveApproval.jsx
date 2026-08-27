import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { principalHrApi } from '../../../../shared/api/client';
import {
  CalendarRange,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Layers,
  ShieldAlert,
  Check,
  X,
  Sparkles,
  Info,
  Building,
  CheckCheck,
  Ban,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

const LEAVE_TYPE_BADGES = {
  CASUAL: { label: 'Casual Leave', variant: 'indigo' },
  SICK: { label: 'Medical / Sick', variant: 'danger' },
  EARNED: { label: 'Earned Leave', variant: 'success' },
  MATERNITY: { label: 'Maternity / Parental', variant: 'purple' },
  UNPAID: { label: 'Unpaid Leave', variant: 'default' },
};

const STATUS_BADGES = {
  APPROVED: { label: 'Approved', variant: 'success' },
  PENDING: { label: 'Pending Review', variant: 'warning' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

export const LeaveApproval = () => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ TOTAL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeaveTypeFilter, setSelectedLeaveTypeFilter] = useState('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approveLeaveId, setApproveLeaveId] = useState(null);
  const [rejectLeaveId, setRejectLeaveId] = useState(null);
  const [cancelLeaveId, setCancelLeaveId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Leave Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [employeeBalance, setEmployeeBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leaveRes, empRes] = await Promise.all([
        principalHrApi.leaves({ status: activeTab !== 'ALL' ? activeTab : undefined, limit: 300 }),
        principalHrApi.employees({ limit: 300 }),
      ]);
      if (leaveRes?.success) {
        setLeaves(leaveRes.data || []);
        if (leaveRes.stats) setStats(leaveRes.stats);
      }
      if (empRes?.success) {
        setEmployees(empRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEmployeeSelect = async (empId) => {
    setSelectedEmpId(empId);
    setEmployeeBalance(null);
    if (!empId) return;

    setLoadingBalance(true);
    try {
      const res = await principalHrApi.leaveBalance(empId);
      if (res?.success) {
        setEmployeeBalance(res.data);
      }
    } catch {
      setEmployeeBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showToast('Please select a staff member', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const emp = employees.find((e) => e.id === selectedEmpId);
      const payload = {
        employeeRefId: selectedEmpId,
        employeeType: emp?.employeeType || 'STAFF',
        employeeId: emp?.employeeId || 'EMP',
        employeeName: emp?.name || 'Staff',
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        department: emp?.department || '',
      };

      await principalHrApi.createLeave(payload);
      showToast(`Leave request submitted for ${emp?.name}!`, 'success');
      setShowCreateModal(false);
      setSelectedEmpId('');
      setReason('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to submit leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!approveLeaveId) return;
    try {
      await principalHrApi.approveLeave(approveLeaveId);
      showToast('Leave request approved successfully!', 'success');
      setApproveLeaveId(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve leave', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectLeaveId) return;
    try {
      await principalHrApi.rejectLeave(rejectLeaveId, rejectReason);
      showToast('Leave request rejected.', 'info');
      setRejectLeaveId(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject leave', 'error');
    }
  };

  const handleCancel = async () => {
    if (!cancelLeaveId) return;
    try {
      await principalHrApi.cancelLeave(cancelLeaveId);
      showToast('Leave request cancelled.', 'info');
      setCancelLeaveId(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to cancel leave', 'error');
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const matchesSearch =
        !searchTerm ||
        (l.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.reason || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedLeaveTypeFilter === 'ALL' ||
        (l.leaveType || '').toUpperCase() === selectedLeaveTypeFilter.toUpperCase();

      return matchesSearch && matchesType;
    });
  }, [leaves, searchTerm, selectedLeaveTypeFilter]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Leave Approval Desk"
        subtitle="Review institutional faculty leave petitions, verify allocated balances, and authorize or reject time-off applications."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSelectedEmpId(employees[0]?.id || '');
                handleEmployeeSelect(employees[0]?.id || '');
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Applications</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.TOTAL || leaves.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Recorded leave petitions</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-650 dark:text-indigo-400">
            <CalendarRange className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Pending Action</span>
            <div className="text-2xl font-black text-amber-500 mt-1">{stats.PENDING || 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting administrative decision</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved Petitions</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.APPROVED || 0}</div>
            <p className="text-[11px] text-slate-400 mt-1">Authorized leaves</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Declined / Closed</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{(stats.REJECTED || 0) + (stats.CANCELLED || 0)}</div>
            <p className="text-[11px] text-slate-400 mt-1">Rejected or cancelled</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Petitions' },
              { id: 'PENDING', label: 'Pending Review' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leaves..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none text-xs font-semibold"
              />
            </div>

            <select
              value={selectedLeaveTypeFilter}
              onChange={(e) => setSelectedLeaveTypeFilter(e.target.value)}
              className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer outline-none"
            >
              <option value="ALL">All Leave Types</option>
              <option value="CASUAL">Casual</option>
              <option value="SICK">Medical / Sick</option>
              <option value="EARNED">Earned</option>
              <option value="MATERNITY">Maternity</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Main Leaves Table */}
      {loading ? (
        <SkeletonTable rows={7} columns={7} />
      ) : filteredLeaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
          <CalendarRange className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No leave petitions found</h4>
          <p className="text-xs max-w-sm mx-auto">No leave requests match your active filter settings.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Leave Category</th>
                  <th className="p-4">Duration & Days</th>
                  <th className="p-4">Reason Description</th>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Review Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredLeaves.map((l) => {
                  const isPending = l.status === 'PENDING';
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">
                            {l.employeeName?.[0] || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{l.employeeName}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{l.employeeId} • {l.department || 'General'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <Badge variant={LEAVE_TYPE_BADGES[l.leaveType]?.variant || 'default'}>
                          {LEAVE_TYPE_BADGES[l.leaveType]?.label || l.leaveType}
                        </Badge>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <p className="text-slate-900 dark:text-white font-bold">{l.days || 1} Day(s)</p>
                        <p className="text-[10px] text-slate-400">
                          {l.startDate ? new Date(l.startDate).toLocaleDateString() : 'N/A'} to {l.endDate ? new Date(l.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>

                      <td className="p-4 max-w-[200px]">
                        <p className="truncate text-slate-600 dark:text-slate-400" title={l.reason}>
                          {l.reason || 'Personal reasons'}
                        </p>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <Badge variant={STATUS_BADGES[l.status]?.variant || 'default'}>
                          {STATUS_BADGES[l.status]?.label || l.status}
                        </Badge>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setApproveLeaveId(l.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectLeaveId(l.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing <strong>{filteredLeaves.length}</strong> recorded leave items
            </span>
            <span>Leave Registry Synced</span>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Submit Leave Application on Behalf of Staff"
        size="lg"
      >
        <form onSubmit={handleCreateLeave} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Select Staff / Faculty Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeId || 'EMP'}) — {e.department || 'General'}
                </option>
              ))}
            </select>
          </div>

          {/* Live Balance Card if loaded */}
          {employeeBalance && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Allocated Quota Balance:</span>
              <div className="flex gap-3 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span>Casual: <strong>{employeeBalance.casualLeaveBalance ?? 12}</strong></span>
                <span>Sick: <strong>{employeeBalance.sickLeaveBalance ?? 10}</strong></span>
                <span>Earned: <strong>{employeeBalance.earnedLeaveBalance ?? 15}</strong></span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Leave Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Medical / Sick</option>
                <option value="EARNED">Earned Leave</option>
                <option value="MATERNITY">Maternity / Parental</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Attending mandatory family wedding / severe viral fever prescribed bed rest..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-semibold"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={!!approveLeaveId}
        title="Approve Leave Application?"
        message="Are you sure you want to approve this leave petition? The applicant's attendance quota balance will be deducted accordingly."
        confirmLabel="Approve Leave"
        confirmVariant="success"
        onConfirm={handleApprove}
        onCancel={() => setApproveLeaveId(null)}
      />

      {/* Reject Confirmation */}
      <Modal
        isOpen={!!rejectLeaveId}
        onClose={() => setRejectLeaveId(null)}
        title="Reject Leave Application"
        size="sm"
      >
        <div className="space-y-4 text-xs font-semibold">
          <p className="text-slate-500">Please provide a constructive reason for rejecting this leave petition:</p>
          <textarea
            rows={3}
            placeholder="e.g. Insufficient coverage during examination term..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setRejectLeaveId(null)}
              className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
};

export default LeaveApproval;
