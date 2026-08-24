import React, { useRef } from 'react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Printer, Library, CheckCircle } from 'lucide-react';

export const ReturnReceipt = ({ returnRecord, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Library Return Receipt - ${returnRecord.id}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              color: black;
              background: white;
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 12px;
            }
            .info-label {
              font-weight: bold;
              width: 100px;
            }
            .signature {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              border-top: 1px dashed #000;
              padding-top: 25px;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Visual Preview */}
      <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-center">
        <div 
          ref={printRef} 
          className="w-full max-w-[320px] p-5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-xl shadow-xs relative"
        >
          {/* Print Stamp */}
          <div className="absolute top-16 right-4 rotate-12 border-2 border-emerald-500/40 text-emerald-500 text-3xs font-bold px-2 py-0.5 rounded uppercase tracking-wider select-none">
            Returned Checked
          </div>

          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-400 dark:border-slate-700 pb-3 mb-4">
            <div className="flex justify-center mb-1">
              <Library className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="font-bold text-sm tracking-wide">GREENWOOD FUTURE SCHOOL</div>
            <div className="text-3xs uppercase tracking-wider text-slate-500 mt-0.5">Library Return Receipt</div>
          </div>

          {/* Transaction Info */}
          <div className="space-y-2">
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Receipt ID:</span>
              <span className="font-semibold">{returnRecord.id}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Member:</span>
              <span className="font-semibold">{returnRecord.borrowerName} ({returnRecord.borrowerCode})</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Book Code:</span>
              <span className="font-semibold">{returnRecord.bookCode}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Book Title:</span>
              <span className="font-semibold line-clamp-1">{returnRecord.bookTitle}</span>
            </div>
            
            <div className="flex border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-2 mt-2">
              <span className="font-bold w-24 text-slate-500">Issue Date:</span>
              <span className="font-semibold">{formatDate(returnRecord.issueDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Return Date:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatDate(returnRecord.returnDate)}</span>
            </div>
            
            <div className="flex border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-2 mt-2">
              <span className="font-bold w-24 text-slate-500">Fine Charged:</span>
              <span className="font-semibold">{formatCurrency(returnRecord.fineAmount || 0)}</span>
            </div>
            {returnRecord.fineAmount > 0 && (
              <div className="flex">
                <span className="font-bold w-24 text-slate-500">Fine Status:</span>
                <span className="font-semibold uppercase text-emerald-600 dark:text-emerald-400">Paid / Settled</span>
              </div>
            )}
            {returnRecord.waiveReason && (
              <div className="flex flex-col text-3xs text-rose-600 dark:text-rose-400 mt-1 italic">
                <span>* Fine waived reason:</span>
                <span className="pl-2 mt-0.5">{returnRecord.waiveReason}</span>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-6 pt-6 border-t border-dashed border-slate-305 dark:border-slate-800 text-center text-3xs text-slate-500">
            Librarian Signature
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-850">
        {onClose && (
          <button
            onClick={onClose}
            className="h-10 px-4 text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all duration-150"
          >
            Close
          </button>
        )}
        <button
          onClick={handlePrint}
          className="h-10 px-4 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Print Return Receipt</span>
        </button>
      </div>
    </div>
  );
};
