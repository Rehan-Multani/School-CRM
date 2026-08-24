import React from 'react';
import { Printer, Download, Mail, Building, ShieldCheck, CheckCircle2 } from 'lucide-react';

function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if ((n = n.toString()).length > 9) return 'Overflow';
    const nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArray) return '';
    let str = '';
    str += Number(nArray[1]) !== 0 ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
    str += Number(nArray[2]) !== 0 ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
    str += Number(nArray[3]) !== 0 ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
    str += Number(nArray[4]) !== 0 ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
    str +=
      Number(nArray[5]) !== 0
        ? (str !== '' ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]])
        : '';
    return str.trim();
  }

  const result = inWords(Math.round(num));
  return `Rupees ${result} Only`;
}

export const SalarySlip = ({ payroll, onPrint }) => {
  if (!payroll) return null;

  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  const bank = payroll.bankDetails || {};
  const gross = Number(payroll.grossEarnings || (payroll.basicSalary || 0) + (payroll.allowances || 0) + (payroll.incentive || 0) + (payroll.bonus || 0) + (payroll.overtime || 0));
  const deductions = Number(payroll.totalDeductions || (payroll.leaveDeduction || 0) + (payroll.advanceLoanDeduction || 0) + (payroll.otherDeduction || 0));
  const net = Number(payroll.netSalary || Math.max(0, gross - deductions));

  return (
    <div className="space-y-4">
      {/* Action Bar (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Voucher Reference:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
            {payroll.transactionRef || `PAY-${payroll.id?.slice(-6).toUpperCase()}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer text-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Payslip / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Payslip Card */}
      <div
        className="bg-white text-slate-900 border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 text-xs max-w-2xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0"
        id="printable-payslip"
      >
        {/* Header Branding */}
        <div className="flex justify-between items-start pb-5 border-b-2 border-slate-900">
          <div className="space-y-1">
            <h1 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Greenfield Public School
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Affiliated to CBSE | Sector 14, Education Enclave, New Delhi - 110001
            </p>
            <p className="text-[10px] text-slate-500">
              Tel: +91 11 2345 6789 | Email: accounts@greenfield.edu
            </p>
          </div>
          <div className="text-right space-y-1 shrink-0">
            <span className="inline-block bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider">
              Salary Payslip
            </span>
            <p className="text-xs font-bold text-slate-900 pt-1">
              Period: {payroll.payrollMonth}
            </p>
            <p className="text-[10px] font-medium text-slate-600">
              Status:{' '}
              <strong className={payroll.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}>
                {payroll.paymentStatus}
              </strong>
            </p>
          </div>
        </div>

        {/* Employee & Bank Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px]">
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Staff Particulars</p>
            <p className="text-slate-900">
              Staff Name: <strong className="font-bold text-slate-900">{payroll.employeeName}</strong>
            </p>
            <p className="text-slate-600">
              Employee ID: <strong className="font-mono text-slate-900">{payroll.employeeId}</strong>
            </p>
            <p className="text-slate-600">
              Department: <strong className="text-slate-900">{payroll.department || 'General'}</strong>
            </p>
            <p className="text-slate-600">
              Designation: <strong className="text-slate-900">{payroll.designation || payroll.employeeRole}</strong>
            </p>
          </div>
          <div className="space-y-1.5 text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Disbursement Details</p>
            <p className="text-slate-600">
              Bank Name: <strong className="text-slate-900">{bank.bankName || 'Direct Transfer'}</strong>
            </p>
            <p className="text-slate-600">
              Account No: <strong className="font-mono text-slate-900">{bank.accountNumber || '—'}</strong>
            </p>
            <p className="text-slate-600">
              IFSC Code: <strong className="font-mono text-slate-900">{bank.ifscCode || '—'}</strong>
            </p>
            <p className="text-slate-600">
              Payment Method: <strong className="text-slate-900">{payroll.paymentMethod || 'BANK_TRANSFER'}</strong>
            </p>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-2 gap-4">
          {/* Earnings Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200">
              <span className="font-black text-[10px] text-slate-900 uppercase tracking-wider">
                Earnings Breakdown
              </span>
            </div>
            <div className="p-3.5 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Basic Pay</span>
                <span className="font-bold">₹{Number(payroll.basicSalary || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">House Rent / Allowances</span>
                <span className="font-bold">₹{Number(payroll.allowances || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(payroll.incentive || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Incentive Pay</span>
                  <span className="font-bold">₹{Number(payroll.incentive).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(payroll.bonus || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Performance Bonus</span>
                  <span className="font-bold">₹{Number(payroll.bonus).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(payroll.overtime || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Overtime Compensation</span>
                  <span className="font-bold">₹{Number(payroll.overtime).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-slate-200 pt-2.5 font-black text-slate-900">
                <span>Gross Earnings</span>
                <span>₹{gross.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Deductions Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200">
              <span className="font-black text-[10px] text-slate-900 uppercase tracking-wider">
                Deductions & Offsets
              </span>
            </div>
            <div className="p-3.5 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Leave Deductions (LWP)</span>
                <span className="font-bold text-rose-600">₹{Number(payroll.leaveDeduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Advance / Loan Recovery</span>
                <span className="font-bold text-rose-600">₹{Number(payroll.advanceLoanDeduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax / Other Deductions</span>
                <span className="font-bold text-rose-600">₹{Number(payroll.otherDeduction || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-200 pt-2.5 font-black text-rose-700">
                <span>Total Deductions</span>
                <span>₹{deductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Payable Banner */}
        <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">
              Net Payable Salary
            </span>
            <span className="text-2xl font-black text-emerald-800">
              ₹{net.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-900 font-bold block">Amount in Words:</span>
            <span className="text-[11px] font-extrabold text-emerald-800 italic">
              {numberToWords(net)}
            </span>
          </div>
        </div>

        {/* Remarks & Signatures */}
        <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-[10px]">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-wider">System Remarks</p>
            <p className="text-slate-600 mt-1">
              {payroll.remarks || 'This is a computer-generated institutional payroll statement and does not require physical seal.'}
            </p>
          </div>
          <div className="text-right space-y-8">
            <div className="pt-6 border-b border-slate-400 inline-block min-w-[160px]">
              <span className="font-bold text-slate-800 text-[11px]">Authorized Signatory</span>
            </div>
            <p className="text-slate-400">Greenfield School Administration & Accounts</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SalarySlip;
