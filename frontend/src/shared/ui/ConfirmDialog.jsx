import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/cn';

// Canonical merged ConfirmDialog — superset of gen-2 (HR/accountant/
// librarian/principal/school-admin/transport, prop names onClose/
// confirmText/cancelText) and gen-1 (teacher/parent, prop names
// onCancel/confirmLabel/cancelLabel). Both naming conventions are
// accepted so every existing call-site keeps working unchanged.
// Also folds in librarian's optional `requireInput` reason-capture flow.
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Do you wish to proceed?',
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'danger',
  confirmVariant,
  requireInput = false,
  inputPlaceholder = 'Please enter a reason...',
  inputLabel = 'Reason',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);

  const close = onClose || onCancel;
  const confirmBtnText = confirmText || confirmLabel || 'Confirm';
  const cancelBtnText = cancelText || cancelLabel || 'Cancel';
  const activeVariant = confirmVariant || variant;

  const colorVariants = {
    danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
    info: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white',
    primary: 'bg-primary hover:bg-primary-hover focus:ring-primary text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white',
  };

  const iconVariants = {
    danger: 'bg-rose-50 text-rose-600 dark:bg-rose-950/20',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20',
    info: 'bg-sky-50 text-sky-600 dark:bg-sky-950/20',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20',
  };

  const handleConfirm = () => {
    if (requireInput && !inputValue.trim()) {
      setError(true);
      return;
    }
    onConfirm(requireInput ? inputValue : undefined);
    setInputValue('');
    setError(false);
    if (close) close();
  };

  const handleClose = () => {
    setInputValue('');
    setError(false);
    if (close) close();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className={cn("p-3 rounded-2xl shrink-0", iconVariants[activeVariant] || iconVariants.danger)}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {requireInput && (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {inputLabel} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              placeholder={inputPlaceholder}
              className={cn(
                "w-full px-3 py-2 border rounded-xl text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500",
                error ? "border-rose-500 focus:ring-rose-500" : "border-slate-200 dark:border-slate-800"
              )}
            />
            {error && (
              <p className="text-xs text-rose-500">
                This field is required to proceed.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
          >
            {cancelBtnText}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
              colorVariants[activeVariant] || colorVariants.danger
            )}
          >
            {confirmBtnText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
