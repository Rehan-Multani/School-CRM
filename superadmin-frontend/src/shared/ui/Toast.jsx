import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const VARIANTS = {
  success: {
    title: 'Success',
    Icon: CheckCircle2,
    accent: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
    bar: 'bg-emerald-500/70',
    duration: 4000,
  },
  error: {
    title: 'Something went wrong',
    Icon: XCircle,
    accent: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-600 ring-rose-500/15 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
    bar: 'bg-rose-500/70',
    duration: 5500,
  },
  warning: {
    title: 'Heads up',
    Icon: AlertTriangle,
    accent: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-600 ring-amber-500/15 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
    bar: 'bg-amber-500/70',
    duration: 5000,
  },
  info: {
    title: 'Notice',
    Icon: Info,
    accent: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-600 ring-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-400/20',
    bar: 'bg-indigo-500/70',
    duration: 4000,
  },
};

const resolveVariant = (type) => VARIANTS[type] || VARIANTS.info;

const ToastCard = ({ t, type, title, message }) => {
  const variant = resolveVariant(type);
  const { Icon } = variant;
  const duration = typeof t.duration === 'number' && Number.isFinite(t.duration) ? t.duration : null;

  return (
    <motion.div
      layout
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={
        t.visible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18 } }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
      className="pointer-events-auto relative w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_18px_40px_-14px_rgba(15,23,42,0.30)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)]"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${variant.accent}`} aria-hidden="true" />

      <div className="flex items-start gap-3 py-3 pl-5 pr-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${variant.chip}`}
          aria-hidden="true"
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
            {title || variant.title}
          </p>
          {message ? (
            <p className="mt-1 break-words text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          aria-label="Dismiss notification"
          className="-mr-0.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      </div>

      {duration ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-200/70 dark:bg-slate-800">
          <motion.span
            className={`block h-full ${variant.bar}`}
            key={t.createdAt}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        </span>
      ) : null}
    </motion.div>
  );
};

/**
 * Shows a themed toast. `title` is optional — the variant supplies a sensible default.
 */
export const showToast = (type, message, title) => {
  const variant = resolveVariant(type);
  return toast.custom(
    (t) => <ToastCard t={t} type={type} title={title} message={message} />,
    {
      // Same message + type replaces the previous one instead of stacking duplicates.
      id: `${type}:${message}`,
      duration: variant.duration,
    },
  );
};

export const AppToaster = () => (
  <Toaster
    position="top-right"
    gutter={10}
    containerStyle={{ top: 76, right: 20, bottom: 20, left: 20 }}
  />
);

export default AppToaster;
