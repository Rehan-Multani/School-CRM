import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareQuote, Star } from 'lucide-react';
import Reveal from '../Reveal';
import GradientBadge from '../ui/GradientBadge';
import { TESTIMONIALS } from '../../data/content';

export const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto advance every 5.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <GradientBadge icon={MessageSquareQuote} className="mb-4">
            Leader Reviews
          </GradientBadge>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Trusted by 500+ Leading Educators
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            Hear how schools, academies, and international institutions streamlined their daily
            operations and modernized parent communication.
          </p>
        </Reveal>

        {/* Carousel Container */}
        <div
          className="mt-14"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Active Featured Testimonial Card */}
          <Reveal>
            <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-8 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Stars and quote */}
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(TESTIMONIALS[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-amber-400" />
                    ))}
                  </div>

                  <blockquote className="text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-200 sm:text-xl">
                    "{TESTIMONIALS[currentIndex].content}"
                  </blockquote>

                  {/* Author detail */}
                  <div className="mt-8 flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-base shadow-md ${TESTIMONIALS[currentIndex].avatarBg}`}
                    >
                      {TESTIMONIALS[currentIndex].avatar}
                    </div>

                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {TESTIMONIALS[currentIndex].name}
                      </h4>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {TESTIMONIALS[currentIndex].role}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {TESTIMONIALS[currentIndex].school}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Arrows & Indicator Dots */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-200/70 pt-6 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {TESTIMONIALS.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => setCurrentIndex(dotIdx)}
                      aria-label={`Go to slide ${dotIdx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentIndex === dotIdx
                          ? 'w-8 bg-indigo-600'
                          : 'w-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous testimonial"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next testimonial"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Grid Preview of other testimonials below */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.filter((_, idx) => idx !== currentIndex).slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentIndex(TESTIMONIALS.findIndex((t) => t.id === item.id))}
                className="cursor-pointer rounded-2xl border border-slate-200/60 bg-white/70 p-4 transition-all duration-200 hover:border-indigo-300 hover:bg-white hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-indigo-700"
              >
                <div className="flex items-center gap-1 text-amber-400 mb-2">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400" />
                  ))}
                </div>
                <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                  "{item.content}"
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-white font-bold text-[10px] ${item.avatarBg}`}
                  >
                    {item.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {item.school}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

