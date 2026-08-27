import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { AreaChart } from '../../components/ui/Charts/AreaChart';
import { BarChart } from '../../components/ui/Charts/BarChart';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { IndianRupee, TrendingUp, AlertTriangle, Percent } from 'lucide-react';

export const FeeMonitoring = () => {
  const { receipts = [], students = [] } = useAppStore();

  // Mock charts/data if store is not populated
  const monthlyCollections = [
    { name: 'April', amount: 450000 },
    { name: 'May', amount: 520000 },
    { name: 'June', amount: 490000 },
    { name: 'July', amount: 610000 },
    { name: 'Aug', amount: 580000 }
  ];

  const duesByClass = [
    { name: 'Class 8', dues: 45000 },
    { name: 'Class 9', dues: 60000 },
    { name: 'Class 10', dues: 85000 },
    { name: 'Class 11', dues: 30000 },
    { name: 'Class 12', dues: 95000 }
  ];

  const columns = [
    { key: 'admissionNo', title: 'Admn No' },
    {
      key: 'name',
      title: 'Student Name',
      sortable: true,
      render: (val) => <span className="font-bold">{val}</span>
    },
    { key: 'class', title: 'Class', sortable: true },
    { key: 'section', title: 'Section' },
    {
      key: 'pendingFees',
      title: 'Pending Fee (₹)',
      sortable: true,
      render: (val) => <span className="font-bold text-rose-600">₹{val}</span>
    },
    {
      key: 'status',
      title: 'Fee Status',
      render: (val, row) => (
        <Badge variant={row.pendingFees > 0 ? 'warning' : 'success'}>
          {row.pendingFees > 0 ? 'Deficit' : 'Paid'}
        </Badge>
      )
    }
  ];

  // Map students with dues
  const studentsWithDues = students
    .filter(s => s.pendingFees > 0)
    .map(s => ({
      id: s.id,
      admissionNo: s.admissionNo,
      name: s.name,
      class: `Class ${s.class}`,
      section: s.section,
      pendingFees: s.pendingFees
    }));

  const displayStudents = studentsWithDues.length > 0 ? studentsWithDues : [
    { id: '1', admissionNo: 'GPS202601', name: 'Aarav Mehta', class: 'Class 10', section: 'A', pendingFees: 15000 },
    { id: '2', admissionNo: 'GPS202612', name: 'Ishita Sharma', class: 'Class 12', section: 'B', pendingFees: 22000 },
    { id: '3', admissionNo: 'GPS202615', name: 'Kabir Verma', class: 'Class 9', section: 'C', pendingFees: 12500 },
    { id: '4', admissionNo: 'GPS202619', name: 'Riya Sen', class: 'Class 8', section: 'A', pendingFees: 9000 },
    { id: '5', admissionNo: 'GPS202622', name: 'Aditya Roy', class: 'Class 12', section: 'A', pendingFees: 27000 }
  ];

  const totalCollected = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 2650000;
  const totalOutstanding = displayStudents.reduce((sum, s) => sum + s.pendingFees, 0);
  const collectionPercentage = Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100) || 96;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee & Dues Monitoring"
        subtitle="Track school tuition collections, outstanding deficits, and student ledger summaries."
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
            <IndianRupee className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Fee Collected</span>
            <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
              ₹{totalCollected.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Outstanding Deficit</span>
            <span className="text-xl font-extrabold text-rose-600 mt-1 block">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
            <Percent className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Collection Rate</span>
            <span className="text-xl font-extrabold text-indigo-600 mt-1 block">
              {collectionPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Monthly Tuition Revenue (Trend)</span>
          </h4>
          <div className="h-56">
            <AreaChart
              data={monthlyCollections}
              dataKey="amount"
              xKey="name"
              height={220}
              color="#10b981"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Outstanding Dues by Class Grade</span>
          </h4>
          <div className="h-56">
            <BarChart
              data={duesByClass}
              dataKey="dues"
              xKey="name"
              height={220}
              color="#f43f5e"
            />
          </div>
        </div>
      </div>

      {/* Outstanding Dues List */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Deficit Accounts Roster</h4>
        <DataTable
          columns={columns}
          data={displayStudents}
          searchPlaceholder="Search students with pending fees..."
          searchKey="name"
        />
      </div>
    </div>
  );
};

export default FeeMonitoring;
