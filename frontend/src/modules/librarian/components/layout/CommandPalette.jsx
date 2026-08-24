import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../utils/constants';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Flatten nested navigation tree items
  const flattenedItems = [];
  NAVIGATION_ITEMS.forEach((item) => {
    if (item.path) {
      flattenedItems.push({
        title: item.title,
        path: item.path,
        icon: item.icon,
        category: 'Main',
      });
    }
    if (Array.isArray(item.children)) {
      item.children.forEach((child) => {
        flattenedItems.push({
          title: child.title,
          path: child.path,
          icon: child.icon || item.icon,
          category: item.title,
        });
      });
    }
  });

  const filteredItems = flattenedItems.filter((item) => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (item.title || '').toLowerCase().includes(q);
    const catMatch = (item.category || '').toLowerCase().includes(q);
    return titleMatch || catMatch;
  });

  const handleSelect = (item) => {
    if (item?.path) {
      navigate(item.path);
    }
    onClose();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query, filteredItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
      />

      {/* Palette Container */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[50vh]">
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a page name or shortcut..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 rounded-md text-3xs font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-800">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.category}-${item.title}-${item.path}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-5 py-3 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/5 dark:text-indigo-400' 
                      : 'text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block">{item.title}</span>
                      <span className="text-4xs text-slate-400 font-bold uppercase tracking-wider block mt-0.5">{item.category}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <CornerDownLeft className="h-3.5 w-3.5 opacity-60 font-bold text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No pages or shortcuts match your query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
