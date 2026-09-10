import React from 'react';
import { ArrowRight, ChevronRight, GitBranch, Sparkles } from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import { WORKFLOW_STEPS } from '../../data/content';

export const WorkflowSection = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-slate-50/60 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <GradientBadge icon={GitBranch} className="mb-4">
            Unified Workflow
          </GradientBadge>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Connected Campus in Five Steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            Experience complete cohesion. Every action in one portal immediately updates the next,
            giving everyone up-to-the-minute updates without redundant phone calls or paper forms.
          </p>
        </Reveal>

        {/* Workflow Diagram & Flow Cards */}
        <div className="mt-16">
          {/* Visual Sequence Chain */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 relative">
            {WORKFLOW_STEPS.map((item, idx) => {
              const Icon = item.icon;
              const isLast = idx === WORKFLOW_STEPS.length - 1;

              return (
                <Reveal key={item.step} delay={idx * 0.08} className="h-full">
                  <div className="group relative flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700/60">
                    <div>
                      {/* Step Indicator & Icon */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-black text-slate-200 dark:text-slate-800">
                          {item.step}
                        </span>
                      </div>

                      {/* Role Pill */}
                      <div className="mt-5">
                        <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {item.role}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="mt-2 text-base font-black tracking-tight text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {item.desc}
                      </p>
                    </div>

                    {/* Flow arrow to next step (hidden on last step & adjusted for responsive) */}
                    {!isLast && (
                      <div className="mt-6 flex items-center justify-end text-slate-300 dark:text-slate-700 lg:hidden">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>

          {/* Connected Flow Line on large screens */}
          <div className="mt-8 hidden items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs font-semibold text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-300 lg:flex">
            <span className="font-bold">Real-time Cycle:</span>
            <span>School Setup</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
            <span>Teachers Mark & Grade</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
            <span>Students Learn & Submit</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
            <span>Parents Track & Pay</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
            <span>Administration Oversees & Grows</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;


