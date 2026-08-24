import React, { useRef } from 'react';
import { generateBarcodePattern } from '../../utils/barcodeHelpers';
import { Printer } from 'lucide-react';

export const BarcodeDisplay = ({ value, label }) => {
  const pattern = generateBarcodePattern(value);
  const printRef = useRef(null);

  const handlePrint = (e) => {
    e.stopPropagation();
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Simple window printing mechanism
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${label || value}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: monospace;
              background-color: white;
              color: black;
              margin: 0;
            }
            .barcode-container {
              border: 1px solid #ccc;
              padding: 20px;
              text-align: center;
              border-radius: 8px;
            }
            .barcode-bars {
              display: flex;
              height: 60px;
              margin-bottom: 8px;
            }
            .bar-black {
              width: 2px;
              background: black;
            }
            .bar-white {
              width: 2px;
              background: transparent;
            }
            .barcode-label {
              font-size: 14px;
              font-weight: bold;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${printContent}
          </div>
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
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
      {/* Printable Area */}
      <div ref={printRef} className="flex flex-col items-center p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xs">
        {label && (
          <div className="text-2xs font-bold text-slate-500 dark:text-slate-400 mb-2 truncate max-w-[200px]">
            {label}
          </div>
        )}
        {/* Render CSS barcode bars */}
        <div className="flex h-12 select-none">
          {pattern.map((isBlack, idx) => (
            <div
              key={idx}
              className={`h-full w-[2px] ${isBlack ? 'bg-slate-900 dark:bg-slate-100' : 'bg-transparent'}`}
            />
          ))}
        </div>
        <div className="text-xs font-mono font-bold tracking-widest text-slate-700 dark:text-slate-300 mt-2">
          {value}
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
      >
        <Printer className="h-4 w-4" />
        <span>Print Barcode Label</span>
      </button>
    </div>
  );
};
