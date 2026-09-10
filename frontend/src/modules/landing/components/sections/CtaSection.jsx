import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Phone, ShieldCheck, Sparkles } from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import { PRODUCT } from '../../data/content';

export const CtaSection = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-500/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 sm:p-14 lg:p-16 text-center text-white shadow-2xl shadow-indigo-600/20 dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/80 dark:to-slate-950 dark:shadow-indigo-950/50">
            {/* Animated Ambient Mesh Background */}
            <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-400/30 blur-[100px] dark:bg-indigo-600/30 animate-float-slow" />
            <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-400/30 blur-[100px] dark:bg-violet-600/30 animate-float-delayed" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-[90px] dark:bg-cyan-500/20" />

            <div className="relative z-10 mx-auto max-w-3xl">
              <GradientBadge
                icon={Sparkles}
                dotColor="bg-emerald-300"
                className="mb-6 !border-white/20 !bg-white/10 !text-white backdrop-blur-md"
              >
                Instant Setup & Deployment
              </GradientBadge>

              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-tight">
                Transform Your School Into a{' '}
                <span className="bg-gradient-to-r from-indigo-200 via-purple-100 to-cyan-200 bg-clip-text text-transparent">
                  Smarter School.
                </span>
              </h2>

              <p className="mt-6 text-base leading-relaxed text-indigo-100 dark:text-slate-300 sm:text-lg">
                Join forward-thinking school administrators, teachers, and parents who have
                eliminated administrative clutter. Set up your institution's tenant today.
              </p>

              {/* Call to action buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-7 py-4 text-sm font-black text-indigo-700 shadow-xl shadow-black/10 transition-all duration-200 hover:bg-slate-50 hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:-translate-y-0.5 dark:border-slate-700 dark:bg-indigo-600/80 dark:hover:bg-indigo-600"
                >
                  <Mail className="h-4 w-4 text-white" />
                  <span>Contact Sales</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-indigo-100/90 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-300 dark:text-emerald-400" />
                  Free 14-day assisted pilot
                </span>
                <span className="h-1 w-1 rounded-full bg-white/40 dark:bg-slate-600" />
                <span>Zero upfront migration fee</span>
                <span className="h-1 w-1 rounded-full bg-white/40 dark:bg-slate-600" />
                <span>Custom school branding included</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CtaSection;

