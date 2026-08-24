import React from 'react';
import { Modal } from '../ui/Modal';
import { Printer, Download, X } from 'lucide-react';
import { exportToCSV } from '../lib/exportHelpers';

export const PrintReportModal = ({ isOpen, onClose, title, documentType, data, children }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (Array.isArray(data)) {
      exportToCSV(data, `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-4xl">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-border">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{documentType || 'Official Document'}</span>
            <p className="text-xs text-muted-foreground">Preview formatted for A4 printing and digital verification</p>
          </div>
          <div className="flex items-center gap-2">
            {Array.isArray(data) && data.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-border rounded-lg shadow-sm hover:bg-slate-100 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-inner font-sans text-slate-900 dark:text-slate-100 print:shadow-none print:border-none print:p-0">
          {children}
        </div>
      </div>
    </Modal>
  );
};
