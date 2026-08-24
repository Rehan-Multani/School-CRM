import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import { DataTable } from '../../../../shared/ui/DataTable';
import {
  Users,
  UserPlus,
  RefreshCw,
  Clock,
  Eye,
  Pencil,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const fetchStaff = useCallback(async () => {
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
          (e) => (e.employeeType || '').toUpperCase() !== 'TEACHER' && e.role !== 'TEACHER'
        );
        setStaffList(list);
      }
      if (deptRes?.success) setDepartments(deptRes.data || []);
      if (desigRes?.success) setDesignations(desigRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleStatus = async (staff) => {
    const nextStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.updateEmployeeStatus(staff.id, nextStatus);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: nextStatus } : s))
      );
      showToast(`Staff member ${staff.name} is now ${nextStatus}!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update status', 'error');
    }
  };

  const handleApprove = async (staff) => {
    try {
      await hrApi.approveEmployee(staff.id);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: 'ACTIVE' } : s))
      );
      showToast(`✓ Staff member ${staff.name} approved & activated!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve staff member', 'error');
    }
  };

  const handleReject = async (staff) => {
    const reason = window.prompt(`Please enter rejection reason for ${staff.name}:`, 'Verification declined');
    if (reason === null) return;
    try {
      await hrApi.rejectEmployee(staff.id, reason);
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, status: 'REJECTED' } : s))
      );
      showToast(`Registration for ${staff.name} rejected.`, 'info');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject staff member', 'error');
    }
  };

  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'ACTIVE' || s.status === 'Active').length;
    const pending = staffList.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'PENDING').length;
    const inactive = staffList.filter((s) => s.status === 'INACTIVE').length;
    return { total, active, pending, inactive };
  }, [staffList]);

  const handleModalSuccess = () => {
    showToast(`✓ Staff member submitted for Admin Approval successfully!`, 'success');
    fetchStaff();
  };

  const columns = useMemo(
    () => [
      {
        header: 'Staff Member',
        id: 'name',
        sortable: true,
        render: (_, s) => (
          <div className="flex items-center gap-3">
            {s.photo ? (
              <img
                src={s.photo}
                alt={s.name}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                {s.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-900 leading-tight dark:text-white">{s.name}</p>
              <p className="mt-0.5 text-[11px] font-normal text-slate-400">{s.email || s.employeeId}</p>
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
        header: 'Role',
        id: 'role',
        sortable: true,
        render: (val) => (
          <span className="inline-flex items-center rounded-md bg-indigo-50/80 px-2.5 py-1 text-xs font-bold uppercase text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {val || 'STAFF'}
          </span>
        ),
      },
      {
        header: 'Department',
        id: 'department',
        sortable: true,
        render: (val) => <span className="text-slate-700 dark:text-slate-300">{val || 'Administration'}</span>,
      },
      {
        header: 'Designation',
        id: 'designation',
        sortable: true,
        render: (val, s) => (
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{val || 'Staff'}</p>
            {s.specialization && <p className="text-[10px] text-slate-400">{s.specialization}</p>}
          </div>
        ),
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
        render: (_, s) => {
          const isPending = s.status === 'PENDING_APPROVAL' || s.status === 'PENDING';
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isPending && (
                <button
                  type="button"
                  onClick={() => handleApprove(s)}
                  className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                  title="Approve & Activate"
                >
                  Approve
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/hr/employees/${s.id}`)}
                className="rounded-full p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                title="View Profile"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingStaff(s);
                  setModalOpen(true);
                }}
                className="rounded-full p-1.5 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                title="Edit Staff Member"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(s)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title={s.status === 'ACTIVE' ? 'Deactivate Staff' : 'Activate Staff'}
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
        key: 'role',
        label: 'Role',
        options: [
          { label: 'HR Manager', value: 'HR' },
          { label: 'Accountant', value: 'ACCOUNTANT' },
          { label: 'Librarian', value: 'LIBRARIAN' },
          { label: 'Transport', value: 'TRANSPORT' },
          { label: 'General Staff', value: 'STAFF' },
        ],
      },
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
        title="Staff Management"
        subtitle="Manage administrative & non-teaching staff (HR, Accountant, Librarian, Transport) profiles, credentials, and approvals."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStaff}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              title="Refresh Staff"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingStaff(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Staff</span>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          <span className="text-[10px] text-slate-400">Non-Teaching Personnel</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Staff</span>
          <p className="mt-1 text-2xl font-black text-emerald-600">{stats.active}</p>
          <span className="text-[10px] text-slate-400">Operational & Working</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Approval</span>
          <p className="mt-1 text-2xl font-black text-amber-600">{stats.pending}</p>
          <span className="text-[10px] text-slate-400">Awaiting Admin Verification</span>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Inactive</span>
          <p className="mt-1 text-2xl font-black text-slate-600 dark:text-slate-400">{stats.inactive}</p>
          <span className="text-[10px] text-slate-400">Disabled accounts</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
          <span>{error}</span>
          <button onClick={fetchStaff} className="font-bold underline hover:no-underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Standardized Consistent Table Component */}
      <DataTable
        columns={columns}
        data={staffList}
        loading={loading}
        searchPlaceholder="Search by name, employee ID, role, designation, email..."
        inlineFilters={inlineFilters}
        enableIndex={true}
        enableExport={true}
        exportFilename="staff_list.csv"
        emptyMessage="No matching staff members found in the directory."
        onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
      />

      {/* Staff Form Modal */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStaff(null);
        }}
        onSuccess={handleModalSuccess}
        editingEmployee={editingStaff}
        initialType="STAFF"
        departments={departments}
        designations={designations}
      />

      <ToastComponent />
    </div>
  );
};

export default StaffManagement;
