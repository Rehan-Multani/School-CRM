import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, Sparkles, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../../utils/constants';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { hasPlan } = useSchoolAdminAuth();
  const availableItems = hasPlan
    ? NAVIGATION_ITEMS
    : NAVIGATION_ITEMS.filter((item) => item.path === '/school-admin/plans');

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items based on user query
  const filteredItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        navigate(filteredItems[selectedIndex].path);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, reports, settings..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
              />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">ESC</span>
            </div>

            {/* Results Grid */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs font-semibold text-slate-400">
                  No pages matching search query
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const ItemIcon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-colors ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15' 
                          : 'text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ItemIcon className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="text-xs font-semibold block">{item.name}</span>
                          <span className={`text-[9px] uppercase tracking-wide ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{item.category}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-bold opacity-75">
                          <span>Open</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Helper Footer */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-[10px] font-semibold text-slate-450 select-none">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Tip: Use arrow keys to navigate routes</span>
              </div>
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Enter</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
