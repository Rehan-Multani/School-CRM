import React from 'react';
import { Smartphone } from 'lucide-react';
import Reveal from '../Reveal';
import StoreBadges from '../StoreBadges';
import { APP_ROLES } from '../../data/content';

// Mobile-app download band. The Play Store / APK links come from
// /platform/app-config (Super Admin â Settings â Mobile app) via StoreBadges.
export const AppDownloadSection = () => {
  return (
    <section id="mobile-app" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-500/20 bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-2xl shadow-indigo-900/30 sm:p-12 lg:p-14">
            <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-white/10 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-[90px]" />

            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile app Â· Android
                </span>

                <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:leading-tight">
                  One app for the people on the move
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-indigo-100 sm:text-base">
                  Teachers, students, parents and transport staff install a single Android app.
                  Sign in once â it opens the right workspace for your role.
                </p>

                <div className="mt-7">
                  <StoreBadges />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {APP_ROLES.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.id}
                      className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                          {Icon ? <Icon className="h-4 w-4" /> : null}
                        </span>
                        <span className="text-sm font-bold">{role.name}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-indigo-100">{role.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AppDownloadSection;
