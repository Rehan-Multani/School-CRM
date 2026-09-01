import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/formatters';
import { 
  ClipboardList, 
  Plus, 
  Layers, 
  Percent, 
  AlertOctagon, 
  Download, 
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelpers';

const SEED_STRUCTURES = [
  { id: 'FS-01', className: 'Nursery - KG', tuition: 24000, admission: 10000, development: 6000, labComputer: 0, library: 2000, sports: 3000, total: 45000, frequency: 'Quarterly', status: 'Active' },
  { id: 'FS-02', className: 'Class 1 - 5 (Primary)', tuition: 32000, admission: 12000, development: 8000, labComputer: 4000, library: 2500, sports: 3500, total: 62000, frequency: 'Quarterly', status: 'Active' },
  { id: 'FS-03', className: 'Class 6 - 8 (Middle)', tuition: 40000, admission: 15000, development: 10000, labComputer: 6000, library: 3000, sports: 4000, total: 78000, frequency: 'Quarterly', status: 'Active' },
  { id: 'FS-04', className: 'Class 9 - 10 (Secondary)', tuition: 48000, admission: 18000, development: 12000, labComputer: 8000, library: 4000, sports: 5000, total: 95000, frequency: 'Quarterly', status: 'Active' },
  { id: 'FS-05', className: 'Class 11 - 12 (Science Stream)', tuition: 58000, admission: 20000, development: 15000, labComputer: 14000, library: 5000, sports: 5000, total: 117000, frequency: 'Quarterly', status: 'Active' },
  { id: 'FS-06', className: 'Class 11 - 12 (Commerce / Arts)', tuition: 52000, admission: 20000, development: 14000, labComputer: 8000, library: 5000, sports: 5000, total: 104000, frequency: 'Quarterly', status: 'Active' }
];

const SEED_FEE_HEADS = [
  { id: 'FH-1', name: 'Tuition Fee', category: 'Academic', frequency: 'Quarterly / Monthly', defaultAmount: 8000, refundable: false, discountEligible: true, description: 'Core instructional and teaching faculty fee' },
  { id: 'FH-2', name: 'Admission / Registration Fee', category: 'One-Time', frequency: 'One-Time', defaultAmount: 15000, refundable: false, discountEligible: false, description: 'Institutional enrollment and registration fee' },
  { id: 'FH-3', name: 'Campus Development Fee', category: 'Annual', frequency: 'Annual', defaultAmount: 10000, refundable: false, discountEligible: false, description: 'Classroom smartboards, furniture, and infrastructure' },
  { id: 'FH-4', name: 'Computer & AI Science Lab', category: 'Academic', frequency: 'Term-wise', defaultAmount: 3500, refundable: false, discountEligible: true, description: 'High-speed coding labs and STEM equipment usage' },
  { id: 'FH-5', name: 'Library & Digital Journals', category: 'Academic', frequency: 'Annual', defaultAmount: 2500, refundable: false, discountEligible: false, description: 'Physical book lending and digital academic subscriptions' },
  { id: 'FH-6', name: 'Sports & Extra-Curricular', category: 'Activities', frequency: 'Term-wise', defaultAmount: 2000, refundable: false, discountEligible: false, description: 'Coaching, sports grounds, and inter-school tournaments' },
  { id: 'FH-7', name: 'Security Caution Deposit', category: 'Deposit', frequency: 'One-Time', defaultAmount: 5000, refundable: true, discountEligible: false, description: 'Refundable security caution money at graduation' }
];

const DISCOUNTS_CONFIG = [
  { id: 'DSC-1', scheme: 'Sibling Concession', beneficiary: 'Second child enrolled in school', discountPercent: '20% on Tuition', applicableHead: 'Tuition Fee' },
  { id: 'DSC-2', scheme: 'Merit Scholarship', beneficiary: 'Score >95% in preceding academic board', discountPercent: '50% on Tuition', applicableHead: 'Tuition Fee' },
  { id: 'DSC-3', scheme: 'Staff Ward Scholarship', beneficiary: 'Children of confirmed school staff', discountPercent: '100% on Tuition', applicableHead: 'Tuition Fee' },
  { id: 'DSC-4', scheme: 'Early Bird Annual Payment', beneficiary: 'Full session fees cleared before April 15', discountPercent: '5% Flat Waiver', applicableHead: 'Total Annual Fee' }
];

const LATE_FEE_RULES = [
  { id: 'LF-1', criteria: 'Grace Period', window: '1st to 10th of every month', fine: '₹0 (No Penalty)', notes: 'Normal fee submission window' },
  { id: 'LF-2', criteria: 'Standard Late Fine', window: '11th to 20th of the month', fine: '₹50 per day', notes: 'Automated late fine calculated on receipt generation' },
  { id: 'LF-3', criteria: 'Critical Overdue Fine', window: 'After 21st of the month', fine: '₹100 per day (Max cap ₹1,500)', notes: 'Automated notice sent to parent portal and SMS' }
];

export const FeeStructure = () => {
  const [activeTab, setActiveTab] = useState('structure');
  const { showToast, ToastComponent } = useToast();
  const [structures, setStructures] = useState(SEED_STRUCTURES);
  const [feeHeads, setFeeHeads] = useState(SEED_FEE_HEADS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newHead, setNewHead] = useState({
    name: '',
    category: 'Academic',
    frequency: 'Quarterly',
    defaultAmount: '',
    refundable: false,
    discountEligible: true,
    description: ''
  });

  const handleExport = () => {
    exportToCSV(structures, `school_fee_structure_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Class fee structure exported successfully.', 'success');
  };

  const handleCreateHead = (e) => {
    e.preventDefault();
    if (!newHead.name || !newHead.defaultAmount) {
      showToast('Please specify fee head name and default amount.', 'error');
      return;
    }
    const created = {
      id: `FH-${Date.now().toString().slice(-4)}`,
      name: newHead.name,
      category: newHead.category,
      frequency: newHead.frequency,
      defaultAmount: Number(newHead.defaultAmount),
      refundable: newHead.refundable,
      discountEligible: newHead.discountEligible,
      description: newHead.description || 'Configured fee line item'
    };
    setFeeHeads([...feeHeads, created]);
    showToast(`Fee head "${created.name}" created.`, 'success');
    setIsModalOpen(false);
  };

  const structureColumns = [
    { key: 'className', title: 'Class Standard', sortable: true, render: (v) => <span className="font-bold text-slate-850 dark:text-slate-100">{v}</span> },
    { key: 'tuition', title: 'Tuition Fee', render: (v) => formatCurrency(v || 0) },
    { key: 'admission', title: 'Admission Fee', render: (v) => formatCurrency(v || 0) },
    { key: 'development', title: 'Development', render: (v) => formatCurrency(v || 0) },
    { key: 'labComputer', title: 'Lab & Computer', render: (v) => formatCurrency(v || 0) },
    { key: 'sports', title: 'Sports & Extra', render: (v) => formatCurrency(v || 0) },
    { key: 'total', title: 'Total / Year', sortable: true, render: (v) => <span className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(v || 0)}</span> },
    { key: 'frequency', title: 'Installment Flow', render: (v) => <span className="text-xs text-slate-500 font-semibold">{v}</span> },
    { key: 'status', title: 'Status', render: (v) => <Badge variant="success">{v}</Badge> }
  ];

  const headColumns = [
    { key: 'name', title: 'Fee Head Name', sortable: true, render: (v, row) => (
      <div>
        <div className="font-bold text-slate-850 dark:text-slate-100">{v}</div>
        <div className="text-[10px] text-slate-400">{row.description}</div>
      </div>
    )},
    { key: 'category', title: 'Category', render: (v) => <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{v}</span> },
    { key: 'frequency', title: 'Frequency' },
    { key: 'defaultAmount', title: 'Default Amount', sortable: true, render: (v) => <span className="font-bold">{formatCurrency(v || 0)}</span> },
    { key: 'refundable', title: 'Refundable', render: (v) => <Badge variant={v ? 'warning' : 'default'}>{v ? 'Yes (Deposit)' : 'No'}</Badge> },
    { key: 'discountEligible', title: 'Concession Eligible', render: (v) => <Badge variant={v ? 'success' : 'default'}>{v ? 'Eligible' : 'Standard'}</Badge> }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Fee Structures & Fee Heads"
        subtitle="Configure class-wise fee schedules, customize fee heads, manage scholarships, and calibrate late payment penalty rules."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Fee Head</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Structure</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Class Structures" value={`${structures.length} Standards`} subtitle="Nursery to Class 12" icon={ClipboardList} />
        <StatCard title="Active Fee Heads" value={`${feeHeads.length} Heads`} subtitle="tuition, lab, sports, dev" icon={Layers} />
        <StatCard title="Concession Rules" value="4 Active Schemes" subtitle="merit, sibling, staff" icon={Percent} />
        <StatCard title="Late Fine Policy" value="₹50 / day" subtitle="applicable past grace window" icon={AlertOctagon} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'structure', label: `Class-Wise Structures (${structures.length})` },
          { id: 'heads', label: `Fee Heads Setup (${feeHeads.length})` },
          { id: 'discounts', label: 'Discounts & Scholarships (4)' },
          { id: 'lateFees', label: 'Late Fee Policy & Penalties' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Class Structures */}
      {activeTab === 'structure' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <DataTable
            columns={structureColumns}
            data={structures}
            searchPlaceholder="Search class fee structure..."
            searchKey="className"
            emptyMessage="No fee structures configured."
          />
        </div>
      )}

      {/* Tab 2: Fee Heads */}
      {activeTab === 'heads' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <DataTable
            columns={headColumns}
            data={feeHeads}
            searchPlaceholder="Search fee heads..."
            searchKey="name"
            emptyMessage="No fee heads defined."
          />
        </div>
      )}

      {/* Tab 3: Discounts & Scholarships */}
      {activeTab === 'discounts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Fee Concessions & Scholarships Configuration</h3>
              <p className="text-xs text-slate-400">Institutional discounts applied automatically during student fee invoicing.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DISCOUNTS_CONFIG.map((d) => (
              <div key={d.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{d.scheme}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {d.discountPercent}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{d.beneficiary}</p>
                <div className="text-[11px] font-semibold text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  Applicable on: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{d.applicableHead}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Late Fee Policy */}
      {activeTab === 'lateFees' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Late Payment & Overdue Penalty Rules</h3>
              <p className="text-xs text-slate-400">Grace period and tiered penalty slabs computed during collection desk transactions.</p>
            </div>
          </div>
          <div className="space-y-3">
            {LATE_FEE_RULES.map((rule) => (
              <div key={rule.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{rule.criteria}</span>
                    <span className="text-xs text-slate-400 font-medium">({rule.window})</span>
                  </div>
                  <p className="text-xs text-slate-500">{rule.notes}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">{rule.fine}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Fee Head Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Fee Head"
        >
          <form onSubmit={handleCreateHead} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="block text-slate-600 dark:text-slate-400">Fee Head Title *</label>
              <input
                type="text"
                value={newHead.name}
                onChange={(e) => setNewHead({ ...newHead, name: e.target.value })}
                placeholder="e.g. Smart Robotics & AI Lab Fee"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Category *</label>
                <select
                  value={newHead.category}
                  onChange={(e) => setNewHead({ ...newHead, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Academic">Academic</option>
                  <option value="Activities">Activities</option>
                  <option value="One-Time">One-Time</option>
                  <option value="Annual">Annual</option>
                  <option value="Deposit">Deposit</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400">Billing Frequency *</label>
                <select
                  value={newHead.frequency}
                  onChange={(e) => setNewHead({ ...newHead, frequency: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Term-wise">Term-wise</option>
                  <option value="Annual">Annual</option>
                  <option value="One-Time">One-Time</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-600 dark:text-slate-400">Default Amount (₹) *</label>
              <input
                type="number"
                value={newHead.defaultAmount}
                onChange={(e) => setNewHead({ ...newHead, defaultAmount: e.target.value })}
                placeholder="e.g. 4500"
                required
                min="0"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-600 dark:text-slate-400">Description</label>
              <textarea
                value={newHead.description}
                onChange={(e) => setNewHead({ ...newHead, description: e.target.value })}
                placeholder="Brief purpose of this fee head"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Save Fee Head
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ToastComponent />
    </div>
  );
};
export default FeeStructure;
