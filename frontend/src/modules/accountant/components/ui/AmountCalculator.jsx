import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';

const DEFAULT_HEADS = [
  { name: 'Tuition Fee', amount: 8000, active: true },
  { name: 'Admission Fee', amount: 3000, active: false },
  { name: 'Transport Fee', amount: 2000, active: false },
  { name: 'Hostel Fee', amount: 5000, active: false },
  { name: 'Library Fee', amount: 500, active: true },
  { name: 'Exam Fee', amount: 1500, active: false },
  { name: 'Other Charges', amount: 1000, active: false }
];

export const AmountCalculator = ({ onChange }) => {
  const [feeHeads, setFeeHeads] = useState(DEFAULT_HEADS);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [scholarshipDeduction, setScholarshipDeduction] = useState(0);
  const [lateFine, setLateFine] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  // Auto calculate when any variable alters
  useEffect(() => {
    const grossTotal = feeHeads
      .filter(h => h.active)
      .reduce((sum, h) => sum + Number(h.amount), 0);

    const discountAmount = Math.round((grossTotal * Number(discountPercent)) / 100);
    const scholarshipAmount = Number(scholarshipDeduction);
    const totalDeductions = discountAmount + scholarshipAmount;
    const totalFines = Number(lateFine);

    const netPayable = Math.max(grossTotal - totalDeductions + totalFines, 0);
    const remaining = Math.max(netPayable - Number(amountPaid), 0);

    // Trigger parent callback
    if (onChange) {
      onChange({
        feeHeads: feeHeads.filter(h => h.active).map(h => ({ name: h.name, amount: h.amount, paid: h.amount })),
        grossTotal,
        discountAmount,
        scholarshipAmount,
        lateFine: totalFines,
        netPayable,
        amountPaid: Number(amountPaid),
        remainingBalance: remaining
      });
    }
  }, [feeHeads, discountPercent, scholarshipDeduction, lateFine, amountPaid, onChange]);

  const handleToggleHead = (idx) => {
    setFeeHeads(prev => prev.map((h, i) => i === idx ? { ...h, active: !h.active } : h));
  };

  const handleAmountChange = (idx, val) => {
    setFeeHeads(prev => prev.map((h, i) => i === idx ? { ...h, amount: Number(val) } : h));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
      {/* Fee Category check grid */}
      <div className="space-y-4 bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2">Select Active Fee Category Heads</span>
        <div className="space-y-3">
          {feeHeads.map((head, idx) => (
            <div key={head.name} className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={head.active}
                  onChange={() => handleToggleHead(idx)}
                  className="rounded text-violet-600 border-slate-350 w-3.5 h-3.5 focus:ring-violet-600"
                />
                <span>{head.name}</span>
              </label>
              {head.active && (
                <input
                  type="number"
                  value={head.amount}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  className="w-20 bg-white dark:bg-slate-900 px-2 py-1 text-right text-xs rounded border border-slate-205 focus:outline-none focus:ring-1 focus:ring-violet-600 font-bold"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Inputs calculations metrics */}
      <div className="space-y-4 bg-white dark:bg-slate-900 border rounded-2xl p-4">
        <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block border-b pb-2">Live Invoice Calculator Matrix</span>
        
        <div className="grid grid-cols-2 gap-3 pb-3 border-b">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">Discount Concession (%)</label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.max(Number(e.target.value), 0))}
              className="w-full bg-slate-55 dark:bg-slate-950 p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">Scholarship Deduction (INR)</label>
            <input
              type="number"
              value={scholarshipDeduction}
              onChange={(e) => setScholarshipDeduction(Math.max(Number(e.target.value), 0))}
              className="w-full bg-slate-55 dark:bg-slate-950 p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">Late Fee Fine (INR)</label>
            <input
              type="number"
              value={lateFine}
              onChange={(e) => setLateFine(Math.max(Number(e.target.value), 0))}
              className="w-full bg-slate-55 dark:bg-slate-950 p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 block font-bold text-emerald-600">Amount Received Today (INR)</label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(Math.max(Number(e.target.value), 0))}
              className="w-full bg-slate-55 dark:bg-slate-950 p-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-600 font-bold border-emerald-200"
            />
          </div>
        </div>

        {/* Live Calculation rows */}
        <div className="space-y-2 text-right">
          <div className="flex justify-between font-medium">
            <span className="text-slate-405">Gross Amount Subtotal</span>
            <span>{formatCurrency(feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0))}</span>
          </div>
          <div className="flex justify-between text-rose-600 font-medium">
            <span>Total Deductions</span>
            <span>-{formatCurrency(Math.round((feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0) * discountPercent) / 100) + Number(scholarshipDeduction))}</span>
          </div>
          <div className="flex justify-between text-rose-500 font-medium">
            <span>Late Fine</span>
            <span>+{formatCurrency(lateFine)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 font-bold border-t pt-2 text-sm">
            <span>Net Billable Total</span>
            <span>{formatCurrency(Math.max(feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0) - (Math.round((feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0) * discountPercent) / 100) + Number(scholarshipDeduction)) + Number(lateFine), 0))}</span>
          </div>
          <div className="flex justify-between text-rose-600 font-black border-t border-dashed pt-1">
            <span>Balance Dues</span>
            <span>{formatCurrency(Math.max(Math.max(feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0) - (Math.round((feeHeads.filter(h => h.active).reduce((sum, h) => sum + h.amount, 0) * discountPercent) / 100) + Number(scholarshipDeduction)) + Number(lateFine), 0) - amountPaid, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AmountCalculator;
