import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, KeyRound, Sparkles } from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import { ALL_ROLES } from '../../data/content';

export const RolesSection = () => {
  return (
    <section id="portals" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <GradientBadge icon={KeyRound} className="mb-4">
            Role-Based Platform
          </GradientBadge>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            A Tailored Experience for{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              Every Stakeholder
            </span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            No cluttered menus or conflicting permissions. Every stakeholder logs into a
            dedicated portal fine-tuned for their exact workflow and daily responsibilities.
          </p>
        </Reveal>

        {/* 9 Role Cards Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_ROLES.map((role, idx) => {
            const Icon = role.icon;
            return (
              <Reveal key={role.id} delay={idx * 0.04}>
                <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800/90 dark:bg-slate-900 dark:hover:border-indigo-700/60 dark:hover:shadow-indigo-950/40">
                  {/* Subtle top accent bar */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div>
                    {/* Header: Icon + Badge */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${role.iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${role.color}`}
                      >
                        {role.badge}
                      </span>
                    </div>

                    {/* Role Title & Description */}
                    <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {role.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {role.desc}
                    </p>

                    {/* Bullet Highlights */}
                    <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800/80">
                      {role.highlights.map((item, hIdx) => (
                        <li
                          key={hIdx}
                          className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Link */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <Link
                      to={role.href}
                      className="inline-flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors duration-200 group-hover:bg-indigo-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-indigo-600 dark:group-hover:text-white"
                    >
                      <span>Launch {role.name} Portal</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
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

export default RolesSection;

