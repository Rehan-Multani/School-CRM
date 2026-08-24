import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { formatCurrency } from '../../utils/formatters';
import { PrintReportModal } from '../../../../shared/components/PrintReportModal';
import { Printer, Download, Eye, Layers } from 'lucide-react';

export const ReceiptManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const { store } = useAppStore();
  const receipts = store.receipts || [];
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const columns = [
    { key: 'receiptNo', title: 'Receipt ID', sortable: true, render: (val) => <span className="font-bold text-indigo-600">{val}</span> },
    { key: 'studentName', title: 'Student Name', sortable: true },
    { key: 'admissionNo', title: 'Admn No' },
    { key: 'class', title: 'Class' },
    { key: 'paymentDate', title: 'Payment Date', sortable: true },
    { 
      key: 'paidAmount', 
      title: 'Paid Amount', 
      sortable: true,
      render: (val) => <span className="font-bold text-emerald-600">{formatCurrency(val)}</span>
    },
    { key: 'paymentMethod', title: 'Channel' },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => (
        <Badge variant={val === 'Paid' ? 'success' : 'warning'}>
          {val}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      title: 'Desk Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedReceipt(row)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-border hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
            title="View & Print Official Receipt"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print PDF</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Receipt Management" 
        subtitle="Access institutional payment records, verify unique receipt numbers, and print official duplicate receipts." 
      />

      <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm">
        <DataTable 
          columns={columns} 
          data={receipts} 
          searchPlaceholder="Search receipts by receipt no, student name, or date..." 
        />
      </div>

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <PrintReportModal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`Official Fee Receipt — ${selectedReceipt.receiptNo}`}
          documentType="Official Fee Receipt"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-border">
              <h2 className="text-xl font-black">Greenfield Public School</h2>
              <p className="text-xs text-slate-500">Affiliated to CBSE | Sector 15, Dwarka, New Delhi</p>
              <span className="text-xs font-bold text-indigo-600 mt-1 block">Official Payment Receipt: {selectedReceipt.receiptNo}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Student Name:</span>
                <span className="font-bold">{selectedReceipt.studentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Admission No:</span>
                <span className="font-bold">{selectedReceipt.admissionNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Date:</span>
                <span className="font-bold">{selectedReceipt.paymentDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Payment Channel:</span>
                <span className="font-bold">{selectedReceipt.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Transaction Ref:</span>
                <span className="font-mono">{selectedReceipt.transactionRef || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Remarks:</span>
                <span>{selectedReceipt.remarks || 'Tuition fee cleared'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border flex justify-between items-center text-sm font-black">
              <span>Total Amount Settled:</span>
              <span className="text-emerald-600">{formatCurrency(selectedReceipt.paidAmount)}</span>
            </div>

            <div className="flex justify-between pt-8 text-xs font-bold text-slate-400">
              <span>Counter Officer: {selectedReceipt.collector || 'Accounts Department'}</span>
              <span>Authorized Signature: ________________</span>
            </div>
          </div>
        </PrintReportModal>
      )}

      <ToastComponent />
    </div>
  );
};
export default ReceiptManagement;
