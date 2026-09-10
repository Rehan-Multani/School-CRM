ï»¿import React from 'react';
import Reveal from '../Reveal';
import CountUp from '../ui/CountUp';
import { STATS } from '../../data/content';

export const StatsSection = () => {
  return (
    <section className="relative z-10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white/90 to-slate-50/90 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800 dark:from-slate-900/90 dark:to-slate-950/90 dark:shadow-black/40">
            {/* Background decorative glow */}
            <div className="pointer-events-none absolute -top-24 right-1/4 -z-10 h-48 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />

            <div className="grid grid-cols-2 gap-8 divide-y divide-slate-200/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-slate-200/70 dark:divide-slate-800">
              {STATS.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.id}
                    className={`flex flex-col items-center text-center ${
                      idx !== 0 ? 'pt-6 sm:pt-0' : ''
                    } ${idx !== 0 ? 'lg:pl-8' : ''}`}
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner dark:bg-indigo-950/50 dark:text-indigo-400">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex items-baseline text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                      <CountUp
                        target={stat.target}
                        decimals={stat.decimals || 0}
                        suffix={stat.suffix}
                        duration={2200}
                      />
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {stat.label}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {stat.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default StatsSection;

