import React, { useRef } from 'react';
import { formatDate } from '../../utils/formatters';
import { Printer, Library } from 'lucide-react';

export const IssueSlip = ({ issue, onClose }) => {
  const slipRef = useRef(null);

  const handlePrint = () => {
    const printContent = slipRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Library Issue Slip - ${issue.id}</title>
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
              justify-content: justify;
              margin-bottom: 6px;
              font-size: 12px;
            }
            .info-label {
              font-weight: bold;
              width: 100px;
              shrink: 0;
            }
            .rules {
              margin-top: 15px;
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 10px;
              line-height: 1.4;
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
          ref={slipRef} 
          className="w-full max-w-[320px] p-5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-xl shadow-xs"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-400 dark:border-slate-700 pb-3 mb-4">
            <div className="flex justify-center mb-1">
              <Library className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="font-bold text-sm tracking-wide">GREENWOOD FUTURE SCHOOL</div>
            <div className="text-3xs uppercase tracking-wider text-slate-500 mt-0.5">Library Issue Receipt</div>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-2">
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Slip ID:</span>
              <span className="font-semibold">{issue.id}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Member:</span>
              <span className="font-semibold">{issue.borrowerName} ({issue.borrowerCode})</span>
            </div>
            {issue.borrowerClass && (
              <div className="flex">
                <span className="font-bold w-24 text-slate-500">Class/Dept:</span>
                <span className="font-semibold">{issue.borrowerClass}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Book Code:</span>
              <span className="font-semibold font-mono">{issue.bookCode}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Book Title:</span>
              <span className="font-semibold line-clamp-1">{issue.bookTitle}</span>
            </div>
            <div className="flex border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-2 mt-2">
              <span className="font-bold w-24 text-slate-500">Issue Date:</span>
              <span className="font-semibold">{formatDate(issue.issueDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24 text-slate-500">Due Date:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatDate(issue.dueDate)}</span>
            </div>
          </div>

          {/* Rules */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-350 dark:border-slate-800 text-3xs text-slate-500 space-y-1 leading-normal">
            <div>1. Return book on or before the due date.</div>
            <div>2. Late return is subject to a fine of INR 2 per day.</div>
            <div>3. Damaged or lost books must be replaced or paid for.</div>
          </div>

          {/* Signatures */}
          <div className="mt-6 pt-6 border-t border-dashed border-slate-300 dark:border-slate-800 text-center text-3xs text-slate-500">
            Authorized Signature
          </div>
        </div>
      </div>

      {/* Trigger button & footer close */}
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
          <span>Print Issue Receipt</span>
        </button>
      </div>
    </div>
  );
};
