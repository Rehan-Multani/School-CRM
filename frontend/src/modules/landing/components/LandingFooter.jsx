import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../../shared/ui/BrandLogo';
import { ALL_ROLES, PRODUCT } from '../data/content';

const linkClass =
  'text-xs font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white';

export const LandingFooter = () => (
  <footer className="border-t border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950">
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Col 1 & 2: Brand and Contact */}
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-2">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 shadow-sm" />
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {PRODUCT.name}
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {PRODUCT.description}
          </p>

          <div className="mt-6 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <a
              href={`mailto:${PRODUCT.email}`}
              className="flex items-center gap-2 transition hover:text-indigo-600 dark:hover:text-white"
            >
              <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>{PRODUCT.email}</span>
            </a>
            <a
              href={`tel:${PRODUCT.phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 transition hover:text-indigo-600 dark:hover:text-white"
            >
              <Phone className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>{PRODUCT.phone}</span>
            </a>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-indigo-500 shrink-0" />
              <span>{PRODUCT.address}</span>
            </p>
          </div>
        </div>

        {/* Col 3: Product */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Product
          </h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="/#features" className={linkClass}>
                Core Features
              </a>
            </li>
            <li>
              <a href="/#features" className={linkClass}>
                Attendance System
              </a>
            </li>
            <li>
              <a href="/#features" className={linkClass}>
                Fees & Billing
              </a>
            </li>
            <li>
              <a href="/#features" className={linkClass}>
                Live GPS Bus Tracking
              </a>
            </li>
            <li>
              <a href="/#workflow" className={linkClass}>
                Workflow Automation
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Solutions / Portals */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Solutions
          </h3>
          <ul className="mt-4 space-y-2.5">
            {ALL_ROLES.slice(0, 6).map((role) => (
              <li key={role.id}>
                <Link to={role.href} className={linkClass}>
                  {role.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 5: Resources */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Resources
          </h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/about" className={linkClass}>
                About School CRM
              </Link>
            </li>
            <li>
              <a href="/#faq" className={linkClass}>
                Knowledge Base & FAQ
              </a>
            </li>
            <li>
              <Link to="/login" className={linkClass}>
                Staff Portal Sign In
              </Link>
            </li>
            <li>
              <Link to="/contact" className={linkClass}>
                Book a Live Demo
              </Link>
            </li>
            <li>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> 99.9% Uptime SLA
              </span>
            </li>
          </ul>
        </div>

        {/* Col 6: Company & Legal */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Company
          </h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/about" className={linkClass}>
                Company Overview
              </Link>
            </li>
            <li>
              <Link to="/contact" className={linkClass}>
                Contact Sales
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link to="/login" className="inline-flex items-center gap-1 font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                Portal Login
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 text-xs text-slate-500 dark:border-slate-800 sm:flex-row">
        <p>© {new Date().getFullYear()} {PRODUCT.name}. Enterprise School Operating System.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="transition hover:text-slate-900 dark:hover:text-slate-300">
            Privacy Policy
          </Link>
          <Link to="/terms" className="transition hover:text-slate-900 dark:hover:text-slate-300">
            Terms of Service
          </Link>
          <Link to="/login" className="transition hover:text-slate-900 dark:hover:text-slate-300 font-semibold">
            Login
          </Link>
          <span>Made in India</span>
        </div>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
