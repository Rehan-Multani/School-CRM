import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { Coins, Search, ArrowLeft, CheckCircle, Printer, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const FeeCollection = () => {
  const [step, setStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { showToast, ToastComponent } = useToast();
  const { store, collectFee } = useAppStore();

  const [collectAmount, setCollectAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [generatedReceipt, setGeneratedReceipt] = useState(null);

  const students = store.students || [];

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setCollectAmount(String(student.pendingFees || 20000));
    setStep(2);
  };

  const handleConfirmCollection = (e) => {
    e.preventDefault();
    const paidNum = Number(collectAmount) || 0;
    if (paidNum <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    const receipt = collectFee({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      admissionNo: selectedStudent.admissionNo,
      class: selectedStudent.class,
      paidAmount: paidNum,
      paymentMethod,
      transactionRef: transactionRef || `REF-${Date.now().toString().slice(-6)}`,
      remarks: remarks || 'Fee collected at institution collection counter',
      collector: 'Accountant (Mr. Alok Sharma)'
    });

    setGeneratedReceipt(receipt);
    showToast(`Fee transaction processed! Receipt #${receipt.receiptNo} generated.`, 'success');
    setStep(1);
    setSelectedStudent(null);
  };

  const columns = [
    { key: 'admissionNo', title: 'Admn No', sortable: true },
    { key: 'name', title: 'Student Name', sortable: true },
    { key: 'class', title: 'Class', render: (val, row) => `${val || ''} (${row.section || 'A'})` },
    { key: 'parentName', title: 'Guardian' },
    { 
      key: 'pendingFees', 
      title: 'Outstanding Dues',
      render: (val) => (
        <span className={`font-bold ${Number(val) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {formatCurrency(val || 0)}
        </span>
      )
    },
    { 
      key: 'feeStatus', 
      title: 'Fee Status',
      render: (val) => (
        <Badge variant={val === 'Paid' ? 'success' : val === 'Partial' ? 'warning' : 'danger'}>
          {val || 'Due'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fee Collection Desk" 
        subtitle="Search student profiles, process payments across modes, and generate official institutional receipts." 
      />

      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Student for Fee Collection</span>
            <span className="text-xs text-slate-400 font-semibold">{students.length} Registered Students</span>
          </div>
          <DataTable 
            columns={columns} 
            data={students} 
            onRowClick={handleStudentSelect}
            searchPlaceholder="Search student by name, admission no, or roll..." 
          />
        </div>
      )}

      {step === 2 && selectedStudent && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Roster</span>
          </button>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h3>
              <p className="text-xs text-slate-500 font-semibold">{selectedStudent.admissionNo} • Class {selectedStudent.class}-{selectedStudent.section || 'A'}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding Due</span>
              <span className="text-base font-black text-rose-600">{formatCurrency(selectedStudent.pendingFees || 0)}</span>
            </div>
          </div>

          <form onSubmit={handleConfirmCollection} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount Being Collected (INR) *</label>
                <input
                  type="number"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground"
                >
                  <option value="Cash">Cash (Counter Deposit)</option>
                  <option value="UPI">UPI (QR / App Transfer)</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Demand Draft">Demand Draft (DD)</option>
                  <option value="POS Card">POS Card Swipe</option>
                  <option value="Net Banking">Net Banking NEFT/RTGS</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Transaction Reference / Cheque No</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. CHQ-990812 or UPI-Ref-7788"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Term 2 Fee Paid with late fee waiver"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              Collect {formatCurrency(Number(collectAmount) || 0)} & Issue Official Receipt
            </button>
          </form>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {generatedReceipt && (
        <PrintReportModal
          isOpen={!!generatedReceipt}
          onClose={() => setGeneratedReceipt(null)}
          title={`Official Fee Receipt — ${generatedReceipt.receiptNo}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">Greenfield Public School</h2>
              <p className="text-xs text-slate-500">Official Fee Payment Receipt • Sector 15, Dwarka, New Delhi</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">Receipt No: {generatedReceipt.receiptNo}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Student Name:</span>
                <span className="font-bold">{generatedReceipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Admission No:</span>
                <span className="font-bold">{generatedReceipt.admissionNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Date:</span>
                <span className="font-bold">{generatedReceipt.paymentDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Method:</span>
                <span className="font-bold">{generatedReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex justify-between items-center text-sm font-black">
              <span>Paid Amount:</span>
              <span className="text-emerald-600">{formatCurrency(generatedReceipt.paidAmount)}</span>
            </div>

            <div className="flex justify-between pt-6 text-xs font-bold text-slate-400">
              <span>Issued By: {generatedReceipt.collector || 'Accountant'}</span>
              <span>Authorized Signature: ________________</span>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};
export default FeeCollection;
