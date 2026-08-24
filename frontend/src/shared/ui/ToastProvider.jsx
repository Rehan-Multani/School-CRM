import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

// Canonical "global provider" Toast — Pattern B.
// Used by librarian, transport, teacher and parent: mount <ToastProvider>
// once near the app root, then call `const toast = useToast()` anywhere
// beneath it and use `toast.success(msg)` / `.error()` / `.warning()` / `.info()`.
//
// This unifies two previously-diverging implementations that shared this
// contract: teacher/parent used a real React Context, while librarian/
// transport used a module-scoped ref as a Context substitute. Both are
// call-site compatible, so they were merged into one Context-based
// implementation here (see shared/ui/Toast.jsx for the separate, and
// genuinely incompatible, "local hook" Toast used by HR/accountant/
// principal/school-admin).
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full px-4 md:px-0 pointer-events-none">
        <AnimatedToastList toasts={toasts} onRemove={removeToast} />
      </div>
    </ToastContext.Provider>
  );
};

const AnimatedToastList = ({ toasts, onRemove }) => (
  <>
    {toasts.map((t) => (
      <ToastItem key={t.id} toast={t} onRemove={onRemove} />
    ))}
  </>
);

const ToastItem = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
  };

  const styles = {
    success: 'border-emerald-200 dark:border-emerald-800',
    error: 'border-rose-200 dark:border-rose-800',
    warning: 'border-amber-200 dark:border-amber-800',
    info: 'border-sky-200 dark:border-sky-800',
  };

  return (
    <div className={cn(
      "pointer-events-auto flex items-center gap-3 bg-white dark:bg-slate-900 border shadow-xl rounded-2xl px-4 py-3 animate-in slide-in-from-right-4 fade-in duration-300",
      styles[toast.type] || styles.info
    )}>
      {icons[toast.type] || icons.info}
      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const useToast = () => useContext(ToastContext);
