import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  Bus,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  IndianRupee,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import FloatingCard from '../ui/FloatingCard';
import { PRODUCT } from '../../data/content';

export const HeroSection = () => {
  const handleScrollToSection = (e, targetId) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-12 lg:pb-24">
      {/* Background ambient gradient spheres */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/15 to-cyan-400/20 blur-[110px] dark:from-indigo-600/25 dark:via-purple-600/15 dark:to-cyan-500/15 animate-pulse-glow" />

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(100,116,139,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.7) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center 20%, black, transparent 75%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-6 xl:col-span-6 text-center lg:text-left">
            <Reveal>
              <GradientBadge icon={Sparkles} className="mb-5">
                Next-Gen School Operating System
              </GradientBadge>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Smart School Management.{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-300 dark:to-cyan-300">
                  Everything Connected.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg lg:max-w-xl">
                One seamless platform bridging administrators, teachers, parents, and students.
                Automate admissions, daily biometric attendance, exams, real-time fee payments,
                and live bus GPS Ã¢â¬â with 9 specialized portals.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-200 hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <a
                  href="#features"
                  onClick={(e) => handleScrollToSection(e, 'features')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 dark:border-slate-700/80 dark:bg-indigo-600/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Explore Platform
                </a>
              </div>
            </Reveal>

            {/* Trust and Feature Bullets */}
            <Reveal delay={0.24}>
              <div className="mt-10 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-6 text-left dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Tenant-Isolated
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    9 Role Portals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Cloud & Real-time
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Animated Interactive Dashboard Mockup Preview with 6 Floating Mini-Cards */}
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal delay={0.15}>
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Glow behind the dashboard */}
                <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl dark:from-indigo-600/30 dark:via-purple-600/20 dark:to-cyan-600/30" />

                {/* Central Main Dashboard Window Mockup */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-indigo-600/95 dark:shadow-black/60 sm:p-5">
                  {/* Browser Window Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-rose-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        admin.schoolcrm.app
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Live Session 2026-27
                      </span>
                    </div>
                  </div>

                  {/* Mock Dashboard Body */}
                  <div className="mt-4 space-y-4">
                    {/* Header stats row in mockup */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-center dark:border-indigo-900/40 dark:bg-indigo-950/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Total Campus
                        </span>
                        <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
                          1,480
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Today's Presence
                        </span>
                        <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
                          97.2%
                        </p>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-2.5 text-center dark:border-purple-900/40 dark:bg-purple-950/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Fee Recovered
                        </span>
                        <p className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
                          94.8%
                        </p>
                      </div>
                    </div>

                    {/* Miniature Chart Visualization */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Weekly Attendance & Academic Trend
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          Real-time telemetry
                        </span>
                      </div>
                      {/* CSS Bar Chart */}
                      <div className="flex h-20 items-end justify-between gap-2 pt-2 px-1">
                        {[
                          { day: 'Mon', val: '92%', h: 'h-[72%]' },
                          { day: 'Tue', val: '96%', h: 'h-[88%]' },
                          { day: 'Wed', val: '94%', h: 'h-[80%]' },
                          { day: 'Thu', val: '98%', h: 'h-[95%]' },
                          { day: 'Fri', val: '95%', h: 'h-[84%]' },
                          { day: 'Sat', val: '89%', h: 'h-[65%]' },
                        ].map((bar, i) => (
                          <div key={bar.day} className="flex flex-1 flex-col items-center gap-1">
                            <div className="w-full rounded-t-md bg-indigo-100 dark:bg-indigo-950/50 relative overflow-hidden flex items-end h-16">
                              <div
                                className={`w-full ${bar.h} rounded-t-md bg-gradient-to-t from-indigo-600 to-cyan-500 transition-all duration-700`}
                              />
                            </div>
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                              {bar.day}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Portal Switcher Bar inside mockup */}
                    <div className="rounded-xl border border-slate-200/70 bg-white p-2.5 dark:border-slate-800 dark:bg-indigo-600/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                        <span>Connected School Roles</span>
                        <span className="text-emerald-500 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          All Online
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Transport'].map((role, idx) => (
                          <span
                            key={role}
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                              idx === 0
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 FLOATING MINI-CARDS SPECIFIED IN REQUIREMENTS */}
                {/* 1. Students */}
                <div className="absolute -top-6 -left-4 sm:-left-8 z-20 w-44 sm:w-48 hidden xs:block">
                  <FloatingCard
                    icon={GraduationCap}
                    title="Students"
                    value="1,480"
                    trend="+12% YoY"
                    trendPositive={true}
                    badgeText="Enrolled"
                    colorScheme="indigo"
                    animationClass="animate-float-slow"
                  />
                </div>

                {/* 2. Teachers */}
                <div className="absolute -top-8 -right-3 sm:-right-6 z-20 w-44 sm:w-48">
                  <FloatingCard
                    icon={Users}
                    title="Teachers"
                    value="86 Active"
                    trend="100% on duty"
                    trendPositive={true}
                    badgeText="Staff"
                    colorScheme="emerald"
                    animationClass="animate-float-delayed"
                  />
                </div>

                {/* 3. Attendance */}
                <div className="absolute top-[38%] -left-6 sm:-left-12 z-20 w-44 sm:w-52">
                  <FloatingCard
                    icon={CalendarCheck}
                    title="Attendance"
                    value="98.2%"
                    trend="Biometric Sync"
                    trendPositive={true}
                    badgeText="Live"
                    colorScheme="cyan"
                    animationClass="animate-float-reverse"
                  />
                </div>

                {/* 4. Fees */}
                <div className="absolute top-[42%] -right-4 sm:-right-10 z-20 w-44 sm:w-52">
                  <FloatingCard
                    icon={IndianRupee}
                    title="Fee Collection"
                    value="Ã¢âÂ¹14.2 Lakhs"
                    trend="Reconciled"
                    trendPositive={true}
                    badgeText="Today"
                    colorScheme="amber"
                    animationClass="animate-float-slow"
                  />
                </div>

                {/* 5. Transport */}
                <div className="absolute -bottom-6 -left-3 sm:-left-6 z-20 w-44 sm:w-48">
                  <FloatingCard
                    icon={Bus}
                    title="Transport GPS"
                    value="18 Buses"
                    trend="All on Route"
                    trendPositive={true}
                    badgeText="Active"
                    colorScheme="violet"
                    animationClass="animate-float-delayed"
                  />
                </div>

                {/* 6. Notifications */}
                <div className="absolute -bottom-7 -right-3 sm:-right-6 z-20 w-44 sm:w-48">
                  <FloatingCard
                    icon={Bell}
                    title="Notifications"
                    value="Circular Sent"
                    trend="SMS + App"
                    trendPositive={true}
                    badgeText="Broadcast"
                    colorScheme="rose"
                    animationClass="animate-float-reverse"
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;


