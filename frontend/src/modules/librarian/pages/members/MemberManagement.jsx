import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { User, Users, GraduationCap, Briefcase, RefreshCw, BookOpen } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';

export const MemberManagement = () => {
  const toast = useToast();
  const location = useLocation();

  const [members, setMembers] = useState([]);
  const [activeIssues, setActiveIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/students')) return 'students';
    if (location.pathname.includes('/staff')) return 'staff';
    return 'all';
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [borrowersRes, issuesRes] = await Promise.allSettled([
        librarianApi.borrowers(),
        librarianApi.issues({ status: 'ISSUED' }),
      ]);

      if (borrowersRes.status === 'fulfilled' && Array.isArray(borrowersRes.value?.data)) {
        setMembers(borrowersRes.value.data);
      } else {
        setMembers([]);
      }

      if (issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value?.data)) {
        setActiveIssues(issuesRes.value.data);
      }
    } catch {
      toast.error('Failed to load library members directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('/students')) setActiveTab('students');
    else if (location.pathname.includes('/staff')) setActiveTab('staff');
  }, [location.pathname]);

  // Compute active loans map per member
  const loanCountMap = {};
  activeIssues.forEach((issue) => {
    if (issue.borrowerRefId) {
      loanCountMap[issue.borrowerRefId] = (loanCountMap[issue.borrowerRefId] || 0) + 1;
    }
  });

  const enrichedMembers = members.map((m) => ({
    ...m,
    booksIssued: loanCountMap[m.id] || 0,
    maxAllowed: m.type === 'TEACHER' ? 5 : 3,
  }));

  const filteredData = enrichedMembers.filter((m) => {
    if (activeTab === 'students') return m.type === 'STUDENT';
    if (activeTab === 'staff') return m.type === 'TEACHER' || m.type === 'STAFF';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Members', count: enrichedMembers.length },
    { id: 'students', label: 'Students', count: enrichedMembers.filter((m) => m.type === 'STUDENT').length },
    { id: 'staff', label: 'Teachers / Staff', count: enrichedMembers.filter((m) => m.type !== 'STUDENT').length },
  ];

  const columns = [
    {
      title: 'Member Code',
      key: 'code',
      sortable: true,
      render: (val) => (
        <span className="font-bold font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {val || '—'}
        </span>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${row.type === 'STUDENT' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30'}`}>
            {row.type === 'STUDENT' ? <GraduationCap className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{val}</span>
        </div>
      ),
    },
    {
      title: 'Member Type',
      key: 'type',
      sortable: true,
      render: (val) => (
        <Badge variant={val === 'STUDENT' ? 'neutral' : 'indigo'}>
          {val}
        </Badge>
      ),
    },
    {
      title: 'Class / Department',
      key: 'class',
      render: (val) => <span className="text-xs text-slate-600 dark:text-slate-400">{val || 'Standard'}</span>,
    },
    {
      title: 'Active Book Loans',
      key: 'booksIssued',
      sortable: true,
      render: (val, row) => (
        <span className={`text-xs font-bold ${val > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
          {val} / {row.maxAllowed} Books
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Badge variant="success">Active</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library Members Directory"
        subtitle="Manage student and staff borrowing privileges, active quotas, and verified profiles."
        actions={
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : filteredData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Users className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Members Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Eligible student and staff profiles are synchronized from the school enrollment database.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={filteredData}
            searchPlaceholder="Search members by name or code..."
            searchKeys={['name', 'code', 'type', 'class']}
            csvFilename="library_members_directory.csv"
          />
        </div>
      )}
    </div>
  );
};
export default MemberManagement;
