import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  GraduationCap,
  IndianRupee,
  MoreVertical,
  PieChart,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import CountUp from '../ui/CountUp';

export const DashboardPreviewSection = () => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'fees' | 'academics'

  return (
    <section className="relative overflow-hidden py-20 lg:py-28 bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[600px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-400/15 via-violet-400/10 to-cyan-400/15 blur-[130px] dark:from-indigo-600/20 dark:via-violet-600/15 dark:to-cyan-500/20" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <GradientBadge icon={Sparkles} className="mb-4">
            Product Preview
          </GradientBadge>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Live Administrative Intelligence
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            Experience the clarity of a modern command center. Track campus attendance,
            fee collections, faculty operations, and student milestones in real time.
          </p>

          {/* Interactive view toggles */}
          <div className="mt-8 inline-flex rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            {[
              { id: 'attendance', label: 'Attendance Telemetry' },
              { id: 'fees', label: 'Fee Collections & Dues' },
              { id: 'academics', label: 'Academics & Enrolments' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Big Dashboard Frame Mockup */}
        <Reveal delay={0.12} className="mt-12">
          <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-indigo-500/5 backdrop-blur-2xl sm:p-6 lg:p-8 dark:border-slate-800/90 dark:bg-slate-900/95 dark:shadow-black/80">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {activeTab === 'attendance'
                      ? 'Daily Campus Attendance & Bio-sync'
                      : activeTab === 'fees'
                      ? 'Term Fee Collection & Ledger Reconcile'
                      : 'Academic Session 2026-27 Overview'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Real-time telemetry stream synchronized across all 9 roles
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Today: 08 Sep 2026</span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Student Attendance</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" /> +2.4%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  <CountUp target={97.8} decimals={1} suffix="%" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  1,448 of 1,480 Present
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Faculty On Duty</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> 100%
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  <CountUp target={86} suffix="" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  0 Unplanned Absences
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Fee Collection</span>
                  <span className="flex items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <TrendingUp className="h-3 w-3" /> Auto-sync
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  ₹<CountUp target={18.4} decimals={1} suffix="L" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  92.4% Quarter Target Met
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Fleet On-Time SLA</span>
                  <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Live GPS
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  <CountUp target={99.4} decimals={1} suffix="%" />
                </div>
                <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                  18 Vehicles Telemetry
                </span>
              </div>
            </div>

            {/* Middle Grid: Main Visualization + Side Activity & Alerts */}
            <div className="mt-6 grid gap-6 lg:grid-cols-12">
              {/* Left 8 Cols: Visual Chart Representation */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800/80 dark:bg-slate-950/60 lg:col-span-8">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800/60">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Hourly Attendance & Gateway Flow
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Biometric punch-in curve vs auto-generated guardian alerts
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Present
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Late
                    </span>
                  </div>
                </div>

                {/* Animated Chart Bars */}
                <div className="mt-6 flex h-52 items-end justify-between gap-3 pt-4 px-2">
                  {[
                    { time: '07:30', p: '25%', l: '5%' },
                    { time: '08:00', p: '85%', l: '12%' },
                    { time: '08:30', p: '98%', l: '18%' },
                    { time: '09:00', p: '96%', l: '8%' },
                    { time: '09:30', p: '99%', l: '2%' },
                    { time: '10:00', p: '98%', l: '0%' },
                    { time: '11:00', p: '98%', l: '0%' },
                    { time: '12:00', p: '97%', l: '1%' },
                  ].map((col) => (
                    <div key={col.time} className="flex flex-1 flex-col items-center gap-2">
                      <div className="relative flex h-40 w-full items-end justify-center rounded-lg bg-slate-200/50 p-1 dark:bg-slate-900/60">
                        {/* Primary bar */}
                        <div
                          style={{ height: col.p }}
                          className="w-1/2 rounded-t-md bg-gradient-to-t from-indigo-600 to-cyan-500 transition-all duration-700"
                        />
                        {/* Secondary bar */}
                        <div
                          style={{ height: col.l }}
                          className="w-1/3 rounded-t-md bg-gradient-to-t from-amber-500 to-amber-400 ml-1 transition-all duration-700"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {col.time}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-white border border-slate-200/80 p-3 text-xs text-slate-600 dark:bg-slate-900/40 dark:border-transparent dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    Automated anomaly detection: Attendance within 99.1% of target.
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Full Audit Log →</span>
                </div>
              </div>

              {/* Right 4 Cols: Live Activity & Notification Feed */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800/80 dark:bg-slate-950/60 lg:col-span-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Recent Activities</h4>
                    </div>
                    <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:border-transparent dark:bg-indigo-500/20 dark:text-indigo-300">
                      Live
                    </span>
                  </div>

                  {/* Activity stream */}
                  <div className="mt-4 space-y-3.5">
                    {[
                      {
                        title: 'Fee Payment Received',
                        desc: 'Class 8-A: ₹28,500 via UPI (Receipt #8412)',
                        time: '2m ago',
                        badge: 'Finance',
                        color: 'text-emerald-600 dark:text-emerald-400',
                      },
                      {
                        title: 'Bus #04 Boarding Checked',
                        desc: '26 students boarded at Green Valley Stop',
                        time: '8m ago',
                        badge: 'Transport',
                        color: 'text-cyan-600 dark:text-cyan-400',
                      },
                      {
                        title: 'Exam Marks Approved',
                        desc: 'Mathematics Unit Test (Class 10)',
                        time: '19m ago',
                        badge: 'Academics',
                        color: 'text-violet-600 dark:text-violet-400',
                      },
                      {
                        title: 'Absence SMS Broadcast',
                        desc: '32 automated WhatsApp triggers dispatched',
                        time: '24m ago',
                        badge: 'Notice',
                        color: 'text-rose-600 dark:text-rose-400',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-2 text-xs border-b border-slate-200/60 dark:border-slate-900/60 pb-2.5 last:border-0"
                      >
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/60 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Connected to MongoDB Enterprise Multi-Tenant Core
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default DashboardPreviewSection;
