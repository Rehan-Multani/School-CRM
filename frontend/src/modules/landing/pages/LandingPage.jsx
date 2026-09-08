import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import Reveal from '../components/Reveal';
import GradientBadge from '../components/ui/GradientBadge';
import HeroSection from '../components/sections/HeroSection';
import StatsSection from '../components/sections/StatsSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import DashboardPreviewSection from '../components/sections/DashboardPreviewSection';
import RolesSection from '../components/sections/RolesSection';
import AppDownloadSection from '../components/sections/AppDownloadSection';
import WorkflowSection from '../components/sections/WorkflowSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import CtaSection from '../components/sections/CtaSection';
import { FAQS, PRODUCT } from '../data/content';

const FaqItem = ({ item, open, onToggle }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-colors dark:border-slate-800/90 dark:bg-slate-900">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:text-indigo-600 dark:hover:text-indigo-400"
    >
      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
        {item.q}
      </span>
      <ChevronDown
        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
          open ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
        }`}
      />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {item.a}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    document.title = `${PRODUCT.name} — ${PRODUCT.headline}`;
  }, []);

  return (
    <div className="relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Quick Statistics Strip with Animated Counters */}
      <StatsSection />

      {/* 3. Comprehensive 11 Core Features Section */}
      <FeaturesSection />

      {/* 4. Large Interactive Product Dashboard Preview */}
      <DashboardPreviewSection />

      {/* 5. Role-Based Platform (All 9 Portals) */}
      <RolesSection />

      {/* 5b. Mobile app download (Play Store / APK — links managed in Super Admin) */}
      <AppDownloadSection />

      {/* 6. Connected Workflow (School -> Teachers -> Students -> Parents -> Admin) */}
      <section id="workflow" className="scroll-mt-20">
        <WorkflowSection />
      </section>

      {/* 7. Testimonials Carousel */}
      <TestimonialsSection />

      {/* 8. FAQ Section */}
      <section id="faq" className="scroll-mt-20 py-20 lg:py-28 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <GradientBadge icon={HelpCircle} className="mb-4">
              Got Questions?
            </GradientBadge>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Everything you need to know about tenant onboarding, role access, and multi-school scalability.
            </p>
          </Reveal>

          <div className="mt-12 space-y-4">
            {FAQS.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.03}>
                <FaqItem
                  item={item}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. High-converting CTA Section */}
      <CtaSection />
    </div>
  );
};

export default LandingPage;

