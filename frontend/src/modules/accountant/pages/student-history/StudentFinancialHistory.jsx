import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { InstallmentTimeline } from '../../components/ui/InstallmentTimeline';
import { Badge } from '../../components/ui/Badge';
import { MOCK_STUDENTS, MOCK_COLLECTIONS, MOCK_INSTALLMENTS, MOCK_DISCOUNTS, MOCK_REFUNDS } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Coins, Receipt, CornerUpLeft, Percent } from 'lucide-react';

export const StudentFinancialHistory = () => {
  const [studentId, setStudentId] = useState('');

  const activeStudent = MOCK_STUDENTS.find(s => s.id === studentId);
  
  // Dues calculations
  const studentReceipts = MOCK_COLLECTIONS.filter(c => c.studentId === studentId);
  const studentInstallmentPlan = MOCK_INSTALLMENTS.find(i => i.studentId === studentId);
  const studentConcessions = MOCK_DISCOUNTS.filter(d => d.studentId === studentId);
  const studentRefunds = MOCK_REFUNDS.filter(r => r.studentId === studentId);

  return (
    <div className="space-y-6 text-xs font-semibold">
      <PageHeader 
        title="Student Financial History Timeline" 
        subtitle="Search student rosters to review complete itemized payment logs, active installment paths, and refunds." 
      />

      {/* Selector Dropdown */}
      <div className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-450 block">Select Student Record File</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full max-w-md bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-violet-605 cursor-pointer"
        >
          <option value="">-- Choose Student --</option>
          {MOCK_STUDENTS.map(s => (
            <option key={s.id} value={s.id}>{s.name} (Class {s.class}-{s.section} | Admn: {s.admissionNo})</option>
          ))}
        </select>
      </div>

      {activeStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left panel: student ledger card & installment plans */}
          <div className="lg:col-span-1 space-y-6">
            {/* profile card */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-5 space-y-4">
              <div>
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider block">Student Financial Profile</span>
                <h3 className="text-sm font-black mt-1 text-white">{activeStudent.name}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Class {activeStudent.class}-{activeStudent.section} • Admn No: {activeStudent.admissionNo}</p>
              </div>
              <div className="border-t border-slate-805 pt-4">
                <span className="text-[9px] font-black text-slate-500 uppercase block">Pending Ledger Balance Dues</span>
                <h4 className="text-base font-black text-rose-500 mt-1">{formatCurrency(activeStudent.pendingFees)}</h4>
              </div>
            </div>

            {/* Installment Plan tracker */}
            {studentInstallmentPlan ? (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block border-b pb-2">Installment Timeline Plan</span>
                <InstallmentTimeline plan={studentInstallmentPlan} />
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm text-center py-6 text-slate-400">
                No active installment plan associated.
              </div>
            )}
          </div>

          {/* Right panel: Timeline of actions */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider block border-b pb-2">Financial Activities Timeline</span>
            
            <div className="relative pl-6 border-l border-slate-100 dark:border-slate-850 space-y-6 ml-2 text-xs">
              {/* Receipts paid */}
              {studentReceipts.map(rec => (
                <div key={rec.id} className="relative">
                  <div className="absolute -left-9.5 top-0.5 bg-violet-100 text-violet-600 rounded-full p-1 border-4 border-white dark:border-slate-900">
                    <Receipt className="w-3 h-3" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-805 dark:text-white">Fee Paid Receipt #{rec.id}</span>
                      <Badge variant="success">Paid</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Amount {formatCurrency(rec.paidAmount)} received on {formatDate(rec.paymentDate)} via {rec.paymentMethod} (Ref: {rec.transactionRef})
                    </p>
                  </div>
                </div>
              ))}

              {/* Discounts concessions */}
              {studentConcessions.map(con => (
                <div key={con.id} className="relative">
                  <div className="absolute -left-9.5 top-0.5 bg-sky-100 text-sky-600 rounded-full p-1 border-4 border-white dark:border-slate-900">
                    <Percent className="w-3 h-3" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-850 dark:text-white">{con.type} Applied ({con.percentage}%)</span>
                      <Badge variant="info">{con.status}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Discount of {formatCurrency(con.amount)} registered under reference {con.approvalRef}. Reason: "{con.reason}"
                    </p>
                  </div>
                </div>
              ))}

              {/* Refunds */}
              {studentRefunds.map(ref => (
                <div key={ref.id} className="relative">
                  <div className="absolute -left-9.5 top-0.5 bg-rose-105 bg-rose-100 text-rose-600 rounded-full p-1 border-4 border-white dark:border-slate-900">
                    <CornerUpLeft className="w-3 h-3" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-805 dark:text-white">Fee Refund Disbursed</span>
                      <Badge variant={ref.status === 'Approved' ? 'success' : 'warning'}>{ref.status}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Refund of {formatCurrency(ref.amount)} issued on receipt reference {ref.receiptId} via {ref.refundMethod}. Reason: "{ref.reason}"
                    </p>
                  </div>
                </div>
              ))}

              {studentReceipts.length === 0 && studentConcessions.length === 0 && studentRefunds.length === 0 && (
                <p className="text-center py-6 text-slate-400">No payment transaction records history mapped.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center text-slate-400">
          Please select a student record from the dropdown menu to view the complete financial timeline.
        </div>
      )}
    </div>
  );
};
export default StudentFinancialHistory;
