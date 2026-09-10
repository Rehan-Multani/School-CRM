import React, { useState } from 'react';
import { CreditCard, Receipt } from 'lucide-react';
import SchoolSubscriptionsPanel from './SchoolSubscriptionsPanel';
import InvoicesPanel from './InvoicesPanel';

// Subscriptions and billing are two views of the same money: the recurring mandate
// and the invoices it produces. They share one sidebar entry so an operator never
// has to guess which page a charge lives on.
const TABS = [
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
];

export default function SubscriptionsIndex() {
  const [activeTab, setActiveTab] = useState('subscriptions');

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
        <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-slate-100 p-1 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'border border-slate-200/60 bg-white text-indigo-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-800 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-white/40 hover:text-slate-900 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon size={14} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'invoices' ? <InvoicesPanel /> : <SchoolSubscriptionsPanel />}
    </div>
  );
}
