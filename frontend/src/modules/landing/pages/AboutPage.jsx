import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Layers, Radio, ShieldCheck } from 'lucide-react';
import Reveal from '../components/Reveal';
import { APP_ROLES, PRODUCT, STATS, WEB_PORTALS } from '../data/content';

const PILLARS = [
  {
    icon: Layers,
    title: 'One platform, many roles',
    body: 'School Admin, Principal, Accountant, HR & Staff and Librarian each get a web portal. Teachers, students, parents and transport staff share one Android app. Every workspace is shaped around what that role actually does each day.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-tenant by architecture',
    body: "Each school is an isolated tenant. Access is checked per tenant and per role at the API gateway, so one school's staff can never see another school's students, fees or academic records.",
  },
  {
    icon: Building2,
    title: 'It looks like your school',
    body: "Your logo, favicon and primary colour propagate into every portal and the app. Parents and staff see your school's identity, not ours.",
  },
  {
    icon: Radio,
    title: 'Cloud and realtime',
    body: 'An API gateway fronts focused backend services. Browser and app push keep people informed, and drivers mark daily pickup and drop from their own API.',
  },
];

export const AboutPage = () => {
  useEffect(() => {
    document.title = `About – ${PRODUCT.name}`;
  }, []);

  return (
    <>
      <div className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.18),_transparent_65%)]" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              About us
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              We build the software a school runs on
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              {PRODUCT.name} is a multi-tenant school management platform. One system carries
              admissions, academics, attendance, examinations, fees, communication, library,
              transport and HR – with a dedicated portal for every role and a single app for
              the people who are rarely at a desk.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.04}>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{stat.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{stat.hint}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delay={i * 0.04}>
                <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{pillar.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-800 dark:bg-slate-900/50 sm:p-9">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Who signs in where</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Web portals</p>
              <ul className="mt-3 space-y-2">
                {WEB_PORTALS.map((portal) => (
                  <li key={portal.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{portal.name}</span>
                    <Link
                      to={portal.href}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      Login <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mobile app roles</p>
              <ul className="mt-3 space-y-2">
                {APP_ROLES.map((role) => (
                  <li key={role.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{role.name}</span>
                    <Link
                      to={role.href}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      Web preview <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-500">
            Super Admin is the platform-operations console for onboarding schools and billing. It
            is deliberately kept off the public portal.
          </p>
        </Reveal>

        <Reveal className="mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Want a walkthrough?</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              We'll show you the portals with your school's data in mind.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
          >
            Contact us <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </>
  );
};

export default AboutPage;

