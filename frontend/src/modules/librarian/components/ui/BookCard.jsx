import React from 'react';
import { BookOpen, MapPin, Hash, User, Trash2, Pencil } from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../../utils/cn';

// Rotating cover palette so cards read as a shelf of different books
// instead of one repeated indigo block.
const COVER_PALETTE = [
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-fuchsia-500 to-fuchsia-700',
  'from-teal-500 to-teal-700',
  'from-orange-500 to-orange-700',
];

const getCoverGradient = (key) => {
  const str = String(key || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return COVER_PALETTE[hash % COVER_PALETTE.length];
};

export const BookCard = ({ book, onView, onEdit, onDelete, onToggleStatus }) => {
  const isAvailable = book.availableCopies > 0;
  const isActive = book.isActive !== false;
  const coverGradient = getCoverGradient(book.category || book.title || book.bookCode);

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/20 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 group flex flex-col justify-between",
      !isActive && "opacity-60"
    )}>
      <div>
        {/* Book cover visual and details */}
        <div className="flex gap-4">
          <div className={cn(
            "w-20 h-28 bg-gradient-to-br rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-200 relative overflow-hidden",
            coverGradient
          )}>
            {/* Book spine aesthetic lines */}
            <div className="absolute left-1 top-0 bottom-0 w-1 bg-black/20" />
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/20" />
            {/* Glossy highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10" />
            <BookOpen className="h-8 w-8 text-white/90" />
            {book.bookCode && (
              <span className="absolute bottom-2 inset-x-0 text-center text-3xs text-white/80 font-mono font-semibold tracking-wider truncate px-1">
                {book.bookCode}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={isAvailable ? 'success' : 'danger'}
              >
                {isAvailable ? `${book.availableCopies}/${book.totalCopies} Available` : 'Issued Out'}
              </Badge>
              <button
                type="button"
                onClick={() => onToggleStatus && onToggleStatus(book)}
                title={isActive ? 'Click to deactivate' : 'Click to activate'}
              >
                <Badge variant={isActive ? 'default' : 'warning'} className="cursor-pointer">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </button>
            </div>
            <h4
              onClick={() => onView && onView(book)}
              title={book.title}
              className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors"
            >
              {book.title}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{book.author}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono text-3xs truncate">{book.bookCode}</span>
            </div>
          </div>
        </div>

        {/* Shelf location & rack info */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 min-w-0 text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <span className="truncate">Rack {book.rackNumber || '—'}, Shelf {book.shelfNumber || '—'}</span>
          </div>
          <span className="shrink-0 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-850">
            {book.category}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onView && onView(book)}
          className="flex-1 h-9 text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all duration-150"
        >
          View Details
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(book)}
            title="Edit Book"
            className="px-3 h-9 text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 rounded-xl transition-all duration-150"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(book)}
            title="Delete Book"
            className="px-3 h-9 text-xs font-semibold border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all duration-150"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
