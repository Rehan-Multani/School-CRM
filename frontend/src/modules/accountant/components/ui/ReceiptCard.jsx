import React from 'react';
import { Printer, Download, Mail, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const ReceiptCard = ({ receipt, onPrint, onSendEmail, onSendSms }) => {
  if (!receipt) return null;

  const handleLocalPrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-6 text-xs max-w-xl mx-auto" id="printable-receipt">
      {/* Receipt Header info */}
      <div className="flex justify-between items-start pb-4 border-b border-dashed">
        <div className="space-y-1">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Greenfield Public School</h2>
          <p className="text-[10px] text-slate-400">Sector 9, Gachibowli, Hyderabad, TS</p>
          <p className="text-[10px] text-slate-400">Email: accounts@greenfield.edu • Tel: +91 99999 55555</p>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <span className="inline-block bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase">
            Official Receipt
          </span>
          <p className="text-[10px] font-bold text-slate-900 dark:text-white block pt-1">No: {receipt.id}</p>
          <p className="text-[9px] text-slate-400">{formatDate(receipt.paymentDate)} {receipt.time || '10:00 AM'}</p>
        </div>
      </div>

      {/* Student / Payer details */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
        <div className="space-y-1.5 font-semibold">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Student Details</span>
          <p className="text-slate-800 dark:text-slate-200">Name: <span className="font-bold">{receipt.studentName}</span></p>
          <p className="text-slate-500">Class: <span className="font-bold text-slate-700 dark:text-slate-300">{receipt.class}-{receipt.section}</span></p>
          <p className="text-slate-550">Admission No: <span className="font-bold text-slate-700 dark:text-slate-300">{receipt.admissionNo}</span></p>
        </div>
        <div className="space-y-1.5 font-semibold text-right">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Session Details</span>
          <p className="text-slate-500">Academic Session: <span className="font-bold text-slate-700 dark:text-slate-350">{receipt.academicSession}</span></p>
          <p className="text-slate-500">Payer Reference ID: <span className="font-bold text-slate-700 dark:text-slate-350">{receipt.studentId}</span></p>
          <p className="text-slate-500">School ID: <span className="font-bold text-slate-700 dark:text-slate-350">{receipt.schoolId}</span></p>
        </div>
      </div>

      {/* Itemized Table of Fee Heads */}
      <div className="space-y-2">
        <span className="text-[9px] font-black text-slate-450 uppercase tracking-wide block">Itemized Fee Heads Allocation</span>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-400 border-b">
                <th className="py-2 px-3">Fee Category Description</th>
                <th className="py-2 px-3 text-right">Gross Allocation</th>
                <th className="py-2 px-3 text-right">Paid Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
              {receipt.feeHeads && receipt.feeHeads.map((head, idx) => (
                <tr key={idx} className="text-slate-700 dark:text-slate-200 font-semibold">
                  <td className="py-2.5 px-3 font-bold">{head.name}</td>
                  <td className="py-2.5 px-3 text-right">{formatCurrency(head.amount)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(head.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deductions and Net payable totals */}
      <div className="border-t border-dashed pt-4 flex flex-col md:flex-row gap-6 md:justify-between items-start">
        <div className="space-y-1.5 font-semibold">
          <p className="text-slate-500">Payment Channel: <span className="font-bold text-slate-800 dark:text-white">{receipt.paymentMethod}</span></p>
          <p className="text-slate-500">Transaction Reference: <span className="font-bold text-slate-800 dark:text-white font-mono">{receipt.transactionRef}</span></p>
          <p className="text-[10px] text-slate-400 font-bold block pt-1.5">Processed by: Account Desk (ACC-001)</p>
        </div>

        <div className="space-y-1.5 font-bold text-right self-end md:self-auto w-full md:w-52">
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Discounts Applied</span>
              <span className="text-rose-600">-{formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          {receipt.scholarshipAmount > 0 && (
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Scholarships</span>
              <span className="text-rose-600">-{formatCurrency(receipt.scholarshipAmount)}</span>
            </div>
          )}
          {receipt.lateFine > 0 && (
            <div className="flex justify-between text-slate-550 font-semibold">
              <span>Late Fine</span>
              <span className="text-rose-605">+{formatCurrency(receipt.lateFine)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500 font-semibold">
            <span>Net Billable</span>
            <span className="text-slate-800 dark:text-white">{formatCurrency(receipt.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 text-sm border-t border-dashed pt-1.5 font-black">
            <span>Amount Paid</span>
            <span>{formatCurrency(receipt.paidAmount)}</span>
          </div>
          {receipt.remainingBalance > 0 && (
            <div className="flex justify-between text-rose-600 font-black">
              <span>Remaining Balance</span>
              <span>{formatCurrency(receipt.remainingBalance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signature & Prints Actions Bar */}
      <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 no-print">
        <span className="text-[9px] text-slate-400 italic">Signature not required. Electronically verified invoice receipt copy.</span>
        <div className="flex items-center gap-2">
          {onSendEmail && (
            <button onClick={onSendEmail} title="Email Receipt" className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500">
              <Mail className="w-4 h-4" />
            </button>
          )}
          {onSendSms && (
            <button onClick={onSendSms} title="SMS Confirmation" className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500">
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleLocalPrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-750 text-white font-bold rounded-xl shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ReceiptCard;
