import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

// Canonical "local hook" Toast â Pattern A.
// Used by HR, accountant, principal and school-admin: call `useToast()`,
// destructure `{ showToast, ToastComponent }`, call `showToast(message, type)`
// and render `<ToastComponent />` once in the page tree.
//
// NOTE: this is a genuinely different consumption contract than the
// context/provider based Toast (see shared/ui/ToastProvider.jsx, used by
// librarian, transport, teacher, parent â consumed as
// `const toast = useToast(); toast.success(msg)` with a <ToastProvider>
// mounted higher up). The two were kept as separate canonical files
// because merging them would break one call-site style or the other.
export const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
  };

  const styles = {
    success: "border-emerald-100 bg-emerald-50/90 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200",
    error: "border-rose-100 bg-rose-50/90 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-900 dark:text-rose-200",
    warning: "border-amber-100 bg-amber-50/90 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-900 dark:text-amber-200",
    info: "border-sky-100 bg-sky-50/90 dark:bg-sky-950/20 dark:border-sky-900/30 text-sky-900 dark:text-sky-200"
  };

  return (
    <div className="fixed top-6 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md max-w-sm",
              styles[type] || styles.success
            )}
          >
            <span className="shrink-0">{icons[type] || icons.success}</span>
            <span className="text-xs font-bold leading-normal">{message}</span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Local hook creator â avoids a context/provider entirely.
export const useToast = () => {
  const [toastState, setToastState] = React.useState(null);

  const showToast = React.useCallback((message, type = 'success', duration = 3000) => {
    setToastState({ message, type, duration, id: Date.now() });
  }, []);

  const hideToast = React.useCallback(() => {
    setToastState(null);
  }, []);

  const ToastComponent = () => (
    <Toast
      message={toastState?.message}
      type={toastState?.type}
      duration={toastState?.duration ?? 3000}
      onClose={hideToast}
    />
  );

  const toast = React.useMemo(() => ({
    show: showToast,
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    hide: hideToast,
  }), [showToast, hideToast]);

  return { showToast, hideToast, ToastComponent, toast };
};

export default useToast;
