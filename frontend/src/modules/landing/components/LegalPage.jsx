import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import Reveal from './Reveal';
import Markdown from './Markdown';
import { LEGAL_EFFECTIVE_DATE, LEGAL_LAST_UPDATED } from '../data/legal';
import { PRODUCT } from '../data/content';
import { stripLegalMeta, useLegalDocuments } from '../data/siteContent';

function formatDate(value, fallback) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

const Skeleton = () => (
  <div className="mt-8 animate-pulse space-y-4">
    <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-900" />
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-900" />
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-900/70" />
        <div className="h-3 w-5/6 rounded bg-slate-100 dark:bg-slate-900/70" />
      </div>
    ))}
  </div>
);

// `which` selects the document from the platform legal payload.
export const LegalPage = ({ docTitle, kicker, which, other }) => {
  const { privacyPolicy, termsOfService, updatedAt, loading } = useLegalDocuments();

  const content = which === 'termsOfService' ? termsOfService : privacyPolicy;
  const body = useMemo(() => stripLegalMeta(content), [content]);
  const lastUpdated = formatDate(updatedAt, LEGAL_LAST_UPDATED);

  useEffect(() => {
    document.title = `${docTitle} – ${PRODUCT.name}`;
  }, [docTitle]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          {kicker}
        </span>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Effective {LEGAL_EFFECTIVE_DATE}
          </span>
          <span>Last updated {lastUpdated}</span>
        </div>
      </Reveal>

      {loading ? (
        <Skeleton />
      ) : (
        <Reveal delay={0.1}>
          <article className="mt-8">
            <Markdown content={body} />
          </article>
        </Reveal>
      )}

      <Reveal delay={0.12}>
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-slate-600 dark:text-slate-400">
            See also{' '}
            <Link to={other.to} className="font-bold text-indigo-600 dark:text-indigo-400">
              {other.label}
            </Link>{' '}
            or reach us on the{' '}
            <Link to="/contact" className="font-bold text-indigo-600 dark:text-indigo-400">
              contact page
            </Link>
            .
          </p>
        </div>
      </Reveal>
    </div>
  );
};

export default LegalPage;

