import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../shared/lib/cn';

// Scroll-reveal wrapper for the landing sections.
//
// Deliberately CSS-only (no framer-motion whileInView): an
// IntersectionObserver flips `shown`, and a short timeout + the
// no-IO / reduced-motion paths guarantee content is never left stuck
// at opacity 0 even if the observer never fires.
export const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!el || reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);

    // Safety net: reveal regardless if the observer hasn't fired.
    const timer = window.setTimeout(() => setShown(true), 1400);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}s` : '0s' }}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Reveal;
