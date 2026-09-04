import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../../../shared/ui/DataTable';
import {
  GraduationCap,
  RefreshCw,
  Clock,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [rejectingTeacher, setRejectingTeacher] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        hrApi.employees({ limit: 500 }),
        hrApi.departments().catch(() => ({ success: false })),
        hrApi.designations().catch(() => ({ success: false })),
      ]);
      if (empRes?.success) {
        const list = (empRes.data || []).filter(
          (e) => (e.employeeType || '').toUpperCase() === 'TEACHER' || e.role === 'TEACHER'
        );
        setTeachers(list);
      }
      if (deptRes?.success) setDepartments(deptRes.data || []);
      if (desigRes?.success) setDesignations(desigRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load teacher directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleToggleStatus = async (teacher) => {
    const nextStatus = teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.updateEmployeeStatus(teacher.id, nextStatus);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, status: nextStatus } : t))
      );
      showToast(`Teacher ${teacher.name} is now ${nextStatus}!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update status', 'error');
    }
  };

  const handleApprove = async (teacher) => {
    try {
      await hrApi.approveEmployee(teacher.id);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacher.id ? { ...t, status: 'ACTIVE' } : t))
      );
      showToast(`✓ Teacher ${teacher.name} approved & activated!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve teacher', 'error');
    }
  };

  const handleOpenReject = (teacher) => {
    setRejectingTeacher(teacher);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e?.preventDefault();
    if (!rejectingTeacher) return;
    const reason = rejectReason.trim() || 'Verification declined by HR Administration';
    try {
      await hrApi.rejectEmployee(rejectingTeacher.id, reason);
      setTeachers((prev) =>
        prev.map((t) => (t.id === rejectingTeacher.id ? { ...t, status: 'REJECTED' } : t))
      );
      showToast(`Registration for ${rejectingTeacher.name} rejected.`, 'info');
      setRejectingTeacher(null);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject teacher', 'error');
    }
  };

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => t.status === 'ACTIVE' || t.status === 'Active').length;
    const pending = teachers.filter((t) => t.status === 'PENDING_APPROVAL' || t.status === 'PENDING').length;
    const inactive = teachers.filter((t) => t.status === 'INACTIVE').length;
    return { total, active, pending, inactive };
  }, [teachers]);

  const handleModalSuccess = () => {
    showToast(`✓ Teacher submitted for Admin Approval successfully!`, 'success');
    fetchTeachers();
  };

  // Columns specification matching the standard table design
  const columns = useMemo(
    () => [
      {
        header: 'Faculty Member',
        id: 'name',
        sortable: true,
        render: (_, t) => (
          <div className="flex items-center gap-3">
            {t.photo ? (
              <img
                src={t.photo}
                alt={t.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-400 dark:ring-indigo-800">
                {t.name?.[0] || 'T'}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900 leading-tight dark:text-white">{t.name}</p>
              <p className="mt-0.5 text-[11px] font-normal text-slate-400">{t.email || t.employeeId}</p>
            </div>
          </div>
        ),
      },
      {
        header: 'Employee ID',
        id: 'employeeId',
        sortable: true,
        render: (val) => <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{val || '—'}</span>,
      },
      {
        header: 'Department',
        id: 'department',
        sortable: true,
        render: (val) => (
          <span className="inline-flex items-center rounded-md bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {val || 'General'}
          </span>
        ),
      },
      {
        header: 'Designation',
        id: 'designation',
        sortable: true,
        render: (val, t) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{val || 'Teacher'}</p>
            {t.specialization && <p className="text-[10px] text-slate-400">{t.specialization}</p>}
          </div>
        ),
      },
      {
        header: 'Qualification',
        id: 'qualification',
        render: (val) => <span className="text-slate-700 dark:text-slate-300">{val || '—'}</span>,
      },
      {
        header: 'Gender',
        id: 'gender',
        render: (val) => <span className="text-slate-600 capitalize dark:text-slate-400">{val?.toLowerCase() || '—'}</span>,
      },
      {
        header: 'Date of Birth / Joined',
        id: 'joiningDate',
        render: (val) => (
          <span className="text-slate-500 whitespace-nowrap">
            {val ? new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        ),
      },
      {
        header: 'Status',
        id: 'status',
        sortable: true,
        render: (status) => {
          const isPending = status === 'PENDING_APPROVAL' || status === 'PENDING';
          const isActive = status === 'ACTIVE' || status === 'Active';
          const isRejected = status === 'REJECTED';

          if (isPending) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Pending
              </span>
            );
          }
          if (isRejected) {
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <XCircle className="h-3 w-3" />
                Rejected
              </span>
            );
          }
          return (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          );
        },
      },
      {
        header: 'Actions',
        id: 'actions',
        align: 'right',
        render: (_, t) => {
          const isPending = t.status === 'PENDING_APPROVAL' || t.status === 'PENDING';
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(t)}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                    title="Approve & Activate"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenReject(t)}
                    className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-rose-700 cursor-pointer"
                    title="Reject Registration"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => navigate(`/hr/employees/${t.id}`)}
                className="rounded-full p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                title="View Profile"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTeacher(t);
                  setModalOpen(true);
                }}
                className="rounded-full p-1.5 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                title="Edit Teacher"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(t)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title={t.status === 'ACTIVE' ? 'Deactivate Teacher' : 'Activate Teacher'}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const inlineFilters = useMemo(
    () => [
      {
        key: 'department',
        label: 'Department',
        options: departments.map((d) => ({ label: d.name, value: d.name })),
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
          { label: 'Inactive', value: 'INACTIVE' },
        ],
      },
      {
        key: 'gender',
        label: 'Gender',
        options: [
          { label: 'Male', value: 'MALE' },
          { label: 'Female', value: 'FEMALE' },
          { label: 'Other', value: 'OTHER' },
        ],
      },
    ],
    [departments]
  );

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Teachers"
        subtitle="Manage faculty directory, onboarding approvals, department placements, and credentials."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTeachers}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              title="Refresh Teachers"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingTeacher(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Add Teacher</span>
            </button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Teachers</span>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          <span className="text-[10px] text-slate-400">Registered Faculty Members</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Faculty</span>
          <p className="mt-1 text-2xl font-black text-emerald-600">{stats.active}</p>
          <span className="text-[10px] text-slate-400">Ready for class assignments</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Approval</span>
          <p className="mt-1 text-2xl font-black text-amber-600">{stats.pending}</p>
          <span className="text-[10px] text-slate-400">Awaiting Admin Verification</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Inactive</span>
          <p className="mt-1 text-2xl font-black text-slate-600 dark:text-slate-400">{stats.inactive}</p>
          <span className="text-[10px] text-slate-400">Disabled faculty accounts</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          <span>{error}</span>
          <button onClick={fetchTeachers} className="font-bold underline hover:no-underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Standardized Consistent Table Component */}
      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        searchPlaceholder="Search by name, roll no., employee ID, designation..."
        inlineFilters={inlineFilters}
        enableIndex={true}
        enableExport={true}
        exportFilename="teachers_list.csv"
        emptyMessage="No matching teachers found in the directory."
        onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
      />

      {/* Teacher Form Modal */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTeacher(null);
        }}
        onSuccess={handleModalSuccess}
        editingEmployee={editingTeacher}
        initialType="TEACHER"
        departments={departments}
        designations={designations}
      />

      {/* Rejection Modal */}
      {rejectingTeacher && (
        <Modal
          isOpen={!!rejectingTeacher}
          onClose={() => setRejectingTeacher(null)}
          title={`Reject Registration — ${rejectingTeacher.name}`}
          size="sm"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4 p-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason for Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete credentials, document verification failed, background check pending..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingTeacher(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};

export default TeacherManagement;
