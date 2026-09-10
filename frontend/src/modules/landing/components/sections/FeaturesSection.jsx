ï»¿import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import { FEATURES } from '../../data/content';

export const FeaturesSection = () => {
  return (
    <section id="features" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <GradientBadge icon={Sparkles} className="mb-4">
            Comprehensive Suite
          </GradientBadge>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Everything Your School Runs On,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              Unified
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            Purpose-built academic and operational modules engineered to eliminate paperwork,
            speed up campus communication, and provide accurate real-time transparency.
          </p>
        </Reveal>

        {/* Feature Grid: 11 cards with modern SaaS aesthetic & hover physics */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            // Highlight the first card or reports card to create nice rhythm
            const isFeatured = idx === 0 || idx === FEATURES.length - 1;

            return (
              <Reveal key={feat.id} delay={idx * 0.04}>
                <div
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800/90 dark:bg-slate-900 dark:hover:border-indigo-700/60 dark:hover:shadow-indigo-950/40 ${
                    isFeatured
                      ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2 bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900'
                      : ''
                  }`}
                >
                  {/* Subtle hover gradient blob inside card */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:from-indigo-500/20 dark:to-purple-500/20" />

                  <div>
                    {/* Top row: Icon + Tag */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feat.gradient} text-white shadow-md shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                        {feat.tag}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 className="mt-5 text-lg font-black tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {feat.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {feat.desc}
                    </p>
                  </div>

                  {/* Bottom micro-interaction link indicator */}
                  <div className="mt-6 flex items-center gap-1.5 pt-4 border-t border-slate-100 text-xs font-bold text-indigo-600 dark:border-slate-800/80 dark:text-indigo-400">
                    <span>Learn module details</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

