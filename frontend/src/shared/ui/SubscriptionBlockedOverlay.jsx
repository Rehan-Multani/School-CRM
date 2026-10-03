import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

// The API answers 402 to every panel except the School Admin's once the school
// has no active plan (never bought one, or it ran out). Someone who was already
// signed in at that moment sees this screen instead of a page full of errors.
// Their session is kept: when the school renews, "Try again" lets them continue.
export const SUBSCRIPTION_BLOCKED_EVENT = 'school-subscription-blocked';

const DEFAULT_MESSAGE =
  'Your school does not have an active subscription, so sign-in is turned off. Please contact your school administrator.';

/** Called by the API clients (shared/api/client.js) on a 402. */
export function announceSubscriptionBlocked(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_BLOCKED_EVENT, { detail: message || DEFAULT_MESSAGE }));
}

export const SubscriptionBlockedOverlay = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onBlocked = (event) => setMessage(event.detail || DEFAULT_MESSAGE);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onBlocked);
  }, []);

  if (!message) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="subscription-blocked-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <h2 id="subscription-blocked-title" className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
          School subscription is not active
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"
          >
            Try again
          </button>
          <a
            href="/login"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBlockedOverlay;
