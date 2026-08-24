import React, { useState } from 'react';
import { useFees } from '../hooks/useStudentHooks';
import { formatCurrency } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Coins, 
  DollarSign,
  QrCode,
  ShieldCheck
} from 'lucide-react';

export const StudentFees = () => {
  const { fees, payFeeOnline } = useFees();
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  const handleOpenPayModal = (installment) => {
    setSelectedInstallment(installment);
    setPaymentMethod('upi');
  };

  const handleConfirmPayment = () => {
    if (!selectedInstallment) return;
    payFeeOnline(selectedInstallment.name);
    setSelectedInstallment(null);
    alert('Payment successful! Your receipt has been generated.');
  };

  const handleDownloadReceipt = (receiptNo) => {
    alert(`Receipt ${receiptNo} downloaded successfully! (Mock)`);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-center items-center text-center p-5 bg-gradient-to-br from-primary to-indigo-600 text-white border-none shadow-premium">
          <span className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Total Academic Fee</span>
          <h2 className="text-3xl font-black mt-1">{formatCurrency(fees.totalFees)}</h2>
          <span className="text-[9px] text-white/50 mt-1">Academic Session 2025-26</span>
        </Card>
        <StatCard title="Paid Amount" value={formatCurrency(fees.paidFees)} icon={Coins} colorClass="bg-emerald-500" />
        <StatCard title="Pending Due" value={formatCurrency(fees.pendingFees)} icon={AlertCircle} colorClass="bg-rose-500" />
        <StatCard 
          title="Scholarship Applied" 
          value={formatCurrency(fees.discounts[0]?.amount || 0)} 
          icon={TrendingUp} 
          colorClass="bg-cyan-500" 
        />
      </div>

      {/* Installments Checklist */}
      <Card>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
          Fee Installment Breakdown
        </h3>
        <div className="space-y-4">
          {fees.installments.map((inst, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-slate-50/20 dark:bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground">{inst.name}</h4>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-semibold">
                  <span>Due by {inst.dueDate}</span>
                  {inst.receiptNo && <span>Receipt: {inst.receiptNo}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                <span className="text-sm font-black text-foreground">{formatCurrency(inst.amount)}</span>
                
                {inst.status === 'Paid' ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Paid</Badge>
                    <button 
                      onClick={() => handleDownloadReceipt(inst.receiptNo)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 active:scale-95 duration-100"
                      title="Download Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">Unpaid</Badge>
                    <button 
                      onClick={() => handleOpenPayModal(inst)}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95 duration-100 select-none"
                    >
                      Pay Online
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* History table */}
      <Card>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
          Transaction Payment History
        </h3>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-slate-400 uppercase font-bold tracking-wider">
                <th className="pb-3 font-semibold">Receipt No</th>
                <th className="pb-3 font-semibold">Payment Date</th>
                <th className="pb-3 font-semibold">Amount Paid</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {fees.history.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                  <td className="py-3.5 text-primary font-bold">{row.receiptNo}</td>
                  <td className="py-3.5 text-slate-500 dark:text-slate-400">{row.date}</td>
                  <td className="py-3.5 text-slate-800 dark:text-slate-200 font-bold">{formatCurrency(row.amount)}</td>
                  <td className="py-3.5 text-slate-500 dark:text-slate-400">{row.mode}</td>
                  <td className="py-3.5 text-right">
                    <button 
                      onClick={() => handleDownloadReceipt(row.receiptNo)}
                      className="inline-flex items-center gap-1 text-[10px] text-primary font-bold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Gateway Modal (Mock) */}
      {selectedInstallment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <Card className="w-full max-w-md p-6 bg-card border border-border shadow-2xl relative">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3">
              Fee Checkout Gateway
            </h3>

            <div className="my-4 text-xs space-y-3">
              <div className="flex justify-between font-medium">
                <span className="text-slate-400">Installment:</span>
                <span className="text-foreground font-bold">{selectedInstallment.name}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-400">Due Amount:</span>
                <span className="text-foreground font-black text-sm">{formatCurrency(selectedInstallment.amount)}</span>
              </div>

              {/* Mode Selectors */}
              <div className="pt-3 border-t border-border">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-3">Select Payment Method</span>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI App', icon: QrCode },
                    { id: 'card', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'net', label: 'Net Banking', icon: DollarSign }
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 duration-100 ${
                          paymentMethod === method.id 
                            ? 'border-primary bg-primary/5 text-primary' 
                            : 'border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Securit check */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-[10px] font-semibold mb-6">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>SSL Secured & encrypted checkout environment</span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setSelectedInstallment(null)}
                className="px-4 py-2 border border-border hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-premium"
              >
                Proceed to Pay
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
