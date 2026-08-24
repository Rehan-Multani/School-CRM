import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmployeeCard } from '../../components/ui/EmployeeCard';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import {
  UserPlus,
  GraduationCap,
  Search,
  Building,
  RefreshCw,
  Users,
  LayoutGrid,
  List,
  Filter,
  ArrowRight,
  MoreVertical,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Pencil,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';

export const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'ALL');
  const [filterType, setFilterType] = useState(searchParams.get('type')?.toUpperCase() || 'ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('TEACHER');
  const [editingEmployee, setEditingEmployee] = useState(null);

  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        hrApi.employees({ limit: 300 }),
        hrApi.departments().catch(() => ({ success: false })),
        hrApi.designations().catch(() => ({ success: false })),
      ]);
      if (empRes?.success) {
        setEmployees(empRes.data || []);
      }
      if (deptRes?.success) {
        setDepartments(deptRes.data || []);
      }
      if (desigRes?.success) {
        setDesignations(desigRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle URL action trigger
  useEffect(() => {
    const action = searchParams.get('action');
    const typeParam = searchParams.get('type')?.toUpperCase();
    if (action === 'add-teacher' || typeParam === 'TEACHER') {
      if (searchParams.get('open') === 'modal') {
        openCreateModal('TEACHER');
      }
    } else if (action === 'add-staff' || typeParam === 'STAFF') {
      if (searchParams.get('open') === 'modal') {
        openCreateModal('STAFF');
      }
    }
  }, [searchParams]);

  const openCreateModal = (type = 'TEACHER') => {
    setEditingEmployee(null);
    setModalType(type);
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setModalType(emp.employeeType || 'TEACHER');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmployee(null);
  };

  const handleModalSuccess = (typeLabel) => {
    showToast(`✓ ${typeLabel} submitted for Admin Approval successfully!`, 'success');
    fetchInitialData();
  };

  const handleToggleStatus = async (emp) => {
    const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await hrApi.updateEmployeeStatus(emp.id, nextStatus);
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
      );
      showToast(`Employee ${emp.name} is now ${nextStatus}!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update status', 'error');
    }
  };

  const handleApprove = async (emp) => {
    try {
      await hrApi.approveEmployee(emp.id);
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status: 'ACTIVE' } : e))
      );
      showToast(`✓ ${emp.employeeType === 'TEACHER' ? 'Faculty' : 'Staff'} member ${emp.name} approved & activated!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to approve employee', 'error');
    }
  };

  const handleReject = async (emp) => {
    const reason = window.prompt(`Please enter rejection reason for ${emp.name}:`, 'Incomplete document verification');
    if (reason === null) return;
    try {
      await hrApi.rejectEmployee(emp.id, reason);
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status: 'REJECTED' } : e))
      );
      showToast(`Registration for ${emp.name} rejected.`, 'info');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to reject employee', 'error');
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchTerm ||
        (emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.specialization || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        filterDept === 'ALL' ||
        (emp.department || '').toLowerCase() === filterDept.toLowerCase();

      const matchesStatus =
        filterStatus === 'ALL' ||
        (emp.status || '').toUpperCase() === filterStatus.toUpperCase() ||
        (filterStatus === 'PENDING_APPROVAL' && (emp.status === 'PENDING_APPROVAL' || emp.status === 'PENDING'));

      const matchesType =
        filterType === 'ALL' ||
        (emp.employeeType || '').toUpperCase() === filterType.toUpperCase();

      return matchesSearch && matchesDept && matchesStatus && matchesType;
    });
  }, [employees, searchTerm, filterDept, filterStatus, filterType]);

  const pendingCount = useMemo(() => {
    return employees.filter((e) => e.status === 'PENDING_APPROVAL' || e.status === 'PENDING').length;
  }, [employees]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Faculty & Staff Directory"
        subtitle="Manage complete institutional profiles, status assignments, designations, departments, and employee onboarding approvals."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal-based Add Buttons */}
            <button
              onClick={() => openCreateModal('TEACHER')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Add Teacher</span>
            </button>

            <button
              onClick={() => openCreateModal('STAFF')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          </div>
        }
      />

      {/* Pending Approvals Quick Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {pendingCount} employee registration{pendingCount > 1 ? 's' : ''} awaiting School Admin approval
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                New faculty & staff members will remain inactive until verified & approved.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('PENDING_APPROVAL')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Advanced Filters Desk */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search faculty by name, Employee ID, designation, specialization, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none text-xs font-semibold"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none text-xs font-semibold"
            >
              <option value="ALL">All Classifications</option>
              <option value="TEACHER">Teaching Faculty</option>
              <option value="STAFF">Administrative & Support Staff</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50/80 dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none text-xs font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Admin Approval</option>
              <option value="ACTIVE">Active (Approved)</option>
              <option value="INACTIVE">Inactive / Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchInitialData} className="underline hover:no-underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-56 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={8} columns={6} />
        )
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-xs">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No faculty or staff found</h4>
          <p className="text-xs max-w-sm mx-auto">
            {searchTerm || filterDept !== 'ALL' || filterStatus !== 'ALL' || filterType !== 'ALL'
              ? 'No staff members match the selected search or filter criteria.'
              : 'Your employee directory is empty. Use "Add Teacher" or "Add Staff" above to register faculty.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onViewProfile={() => navigate(`/hr/employees/${emp.id}`)}
              onEdit={() => openEditModal(emp)}
              onToggleStatus={handleToggleStatus}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Department & Designation</th>
                  <th className="p-4">Staff Type</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredEmployees.map((emp) => {
                  const isPending = emp.status === 'PENDING_APPROVAL' || emp.status === 'PENDING';
                  const isActive = emp.status === 'ACTIVE' || emp.status === 'Active';
                  const isRejected = emp.status === 'REJECTED';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-xs shrink-0">
                            {emp.name?.[0] || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{emp.employeeId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-900 dark:text-white">{emp.department || 'General'}</p>
                        <p className="text-[11px] text-slate-400">{emp.designation || 'Staff'}</p>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                          {emp.employeeType || 'STAFF'}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{emp.email || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400">{emp.phone || 'N/A'}</p>
                      </td>

                      <td className="p-4 whitespace-nowrap text-slate-500">
                        {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Pending Approval</span>
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
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApprove(emp)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(emp)}
                                className="px-2 py-1 text-[11px] font-bold border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              className="px-2.5 py-1 text-[11px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/hr/employees/${emp.id}`)}
                            className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer shadow-2xs"
                          >
                            <span>Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing <strong>{filteredEmployees.length}</strong> of <strong>{employees.length}</strong> registered personnel
            </span>
            <span>Live MongoDB Synced</span>
          </div>
        </div>
      )}

      {/* Identical Modal Form */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
        editingEmployee={editingEmployee}
        initialType={modalType}
        departments={departments}
        designations={designations}
      />

      <ToastComponent />
    </div>
  );
};

export default EmployeeList;
