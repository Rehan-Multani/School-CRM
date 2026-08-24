import React, { useState } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAppStore } from '../../../shared/store/useAppStore';
import { formatCurrency } from '../../student/utils/formatters';
import { PrintReportModal } from '../../../shared/components/PrintReportModal';
import { CreditCard, Download, CheckCircle, XCircle, AlertCircle, Loader2, Printer } from 'lucide-react';

export const ParentFees = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const { store, collectFee } = useAppStore();

  const [payingInstallment, setPayingInstallment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | loading | success | failure
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const student = store.students.find(s => s.id === (selectedChildId || 'STU108902')) || store.students[0];
  const receipts = store.receipts.filter(r => r.studentId === student?.id || r.admissionNo === student?.admissionNo);

  const totalFees = student?.totalFees || 85000;
  const paidFees = student?.paidFees || 55000;
  const pendingFees = student?.pendingFees || (totalFees - paidFees);

  const installments = [
    { name: 'Term 1 Tuition Fee', amount: 35000, dueDate: '2026-05-15', status: 'Paid', receiptNo: receipts[0]?.receiptNo || 'RCT-2026-0891' },
    { name: 'Term 2 Tuition Fee', amount: 20000, dueDate: '2026-08-30', status: paidFees >= 55000 ? 'Paid' : 'Unpaid', receiptNo: paidFees >= 55000 ? (receipts[1]?.receiptNo || 'RCT-2026-0892') : null },
    { name: 'Term 3 Final Tuition Fee', amount: 30000, dueDate: '2026-11-30', status: paidFees >= 85000 ? 'Paid' : 'Unpaid', receiptNo: paidFees >= 85000 ? (receipts[2]?.receiptNo || 'RCT-2026-0893') : null }
  ];

  const handlePayClick = (inst) => {
    setPayingInstallment(inst);
    setPaymentStatus('idle');
  };

  const handleProcessPayment = async () => {
    setPaymentStatus('loading');
    await new Promise(r => setTimeout(r, 1200));

    const receipt = collectFee({
      studentId: student?.id || 'STU108902',
      studentName: student?.name || 'Aarav Sharma',
      admissionNo: student?.admissionNo || 'ADM-2024-8902',
      class: student?.class || 'Class 10',
      paidAmount: payingInstallment.amount,
      paymentMethod: `${paymentMethod} (Parent Gateway)`,
      remarks: `Settlement for ${payingInstallment.name}`,
      collector: 'Parent (Ramesh Sharma)'
    });

    setPaymentStatus('success');
    toast.success(`Payment of ${formatCurrency(payingInstallment.amount)} processed successfully! Receipt: ${receipt?.receiptNo}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Fees Ledger & Payments</h2>
        <p className="text-xs text-slate-500 mt-0.5">Pay outstanding tuition fees online and access verified institution receipts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center p-4">
          <p className="text-xl font-black text-foreground">{formatCurrency(totalFees)}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Total Academic Fees</p>
        </Card>
        <Card className="text-center p-4 border-l-4 border-emerald-500">
          <p className="text-xl font-black text-emerald-500">{formatCurrency(paidFees)}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Total Paid to Date</p>
        </Card>
        <Card className="text-center p-4 border-l-4 border-rose-500">
          <p className="text-xl font-black text-rose-500">{formatCurrency(pendingFees)}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Outstanding Dues</p>
        </Card>
      </div>

      {/* Installments List */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Installment Schedules</h3>
        <div className="space-y-3">
          {installments.map((inst, idx) => (
            <Card key={idx} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">{inst.name}</h4>
                  <Badge variant={inst.status === 'Paid' ? 'success' : 'danger'}>
                    {inst.status}
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Due Date: {inst.dueDate} {inst.receiptNo && `• Receipt ${inst.receiptNo}`}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-foreground">{formatCurrency(inst.amount)}</span>
                {inst.status === 'Paid' ? (
                  <button
                    onClick={() => setSelectedReceipt({
                      receiptNo: inst.receiptNo || 'RCT-2026-0891',
                      studentName: student.name,
                      admissionNo: student.admissionNo,
                      class: student.class,
                      paidAmount: inst.amount,
                      paymentDate: '2026-08-14',
                      paymentMethod: 'UPI Online'
                    })}
                    className="flex items-center gap-1 px-3 py-1.5 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Receipt</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePayClick(inst)}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    Pay Online
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Institutional Receipts History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b">
              <tr>
                <th className="p-2">Receipt No</th>
                <th className="p-2">Date</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Payment Method</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {receipts.map(rc => (
                <tr key={rc.receiptNo}>
                  <td className="p-2 font-bold text-indigo-600">{rc.receiptNo}</td>
                  <td className="p-2">{rc.paymentDate}</td>
                  <td className="p-2 font-bold">{formatCurrency(rc.paidAmount)}</td>
                  <td className="p-2">{rc.paymentMethod}</td>
                  <td className="p-2"><Badge variant="success">Verified</Badge></td>
                  <td className="p-2">
                    <button
                      onClick={() => setSelectedReceipt(rc)}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PAYMENT GATEWAY MODAL */}
      <Modal isOpen={!!payingInstallment} onClose={() => setPayingInstallment(null)} title="Secure Payment Gateway">
        {payingInstallment && (
          <div className="space-y-4">
            {paymentStatus === 'idle' && (
              <>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{payingInstallment.name}</span>
                    <span className="text-indigo-600">{formatCurrency(payingInstallment.amount)}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Student: {student?.name} ({student?.admissionNo})</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose Payment Method</label>
                  {['UPI (Google Pay, PhonePe, Paytm)', 'Net Banking (All Major Banks)', 'Credit / Debit Card'].map(m => (
                    <label key={m} className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-white dark:bg-slate-950 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="paymethod"
                        checked={paymentMethod.startsWith(m.slice(0, 3))}
                        onChange={() => setPaymentMethod(m)}
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleProcessPayment}
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Confirm & Pay {formatCurrency(payingInstallment.amount)}
                </button>
              </>
            )}

            {paymentStatus === 'loading' && (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Processing secure transaction with bank server...</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
                <h4 className="text-sm font-bold">Payment Verified & Settled!</h4>
                <p className="text-xs text-slate-400">Institutional receipt generated. Ledger synchronized in real time.</p>
                <button
                  onClick={() => setPayingInstallment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-xl"
                >
                  Close & Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* RECEIPT PREVIEW MODAL */}
      {selectedReceipt && (
        <PrintReportModal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`Fee Receipt — ${selectedReceipt.receiptNo}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">Greenfield Public School</h2>
              <p className="text-xs text-slate-500">Official Fee Payment Receipt</p>
              <span className="text-xs font-bold text-indigo-600">{selectedReceipt.receiptNo}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Student Name:</span>
                <span className="font-bold">{selectedReceipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Admission Number:</span>
                <span className="font-bold">{selectedReceipt.admissionNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Date:</span>
                <span className="font-bold">{selectedReceipt.paymentDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Method:</span>
                <span className="font-bold">{selectedReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border flex justify-between items-center text-sm font-black">
              <span>Amount Paid:</span>
              <span className="text-emerald-600">{formatCurrency(selectedReceipt.paidAmount)}</span>
            </div>

            <div className="flex justify-between pt-6 text-xs font-bold text-slate-400">
              <span>Collector: Accounts Department</span>
              <span>Authorized Signature: ________________</span>
            </div>
          </div>
        </PrintReportModal>
      )}
    </div>
  );
};
export default ParentFees;
