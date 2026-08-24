import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, ArrowRight, CornerDownLeft } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../utils/constants';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter routes by query
  const filtered = NAVIGATION_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Handle keys (up, down, enter, esc)
  useEffect(() => {
    const handleKeys = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  // Auto-scroll list when selection changes
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 select-none">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Palette Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg z-10 overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search zone */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-850 shrink-0">
          <Search className="w-5 h-5 text-slate-405 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type page name, e.g. Teachers, Leave..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar min-h-24">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-slate-400">
              No matching pages found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <span className="text-xs font-bold block">{item.name}</span>
                      <span className={`text-[9px] font-medium block mt-0.5 uppercase tracking-wide ${isSelected ? 'text-emerald-200' : 'text-slate-450'}`}>{item.category}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-100">
                      <span>Jump</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick tips footer */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 shrink-0 flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
          <span>Arrows to navigate</span>
          <span>Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
