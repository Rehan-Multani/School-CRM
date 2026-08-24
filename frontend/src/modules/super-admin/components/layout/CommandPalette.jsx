import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Sparkles,
  CornerDownLeft,
  LayoutDashboard,
  School,
  CreditCard,
  Bell,
  DollarSign,
  Receipt,
  FileText,
  Scale,
  LifeBuoy,
  Settings,
  SunMoon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useSuperAdminTheme } from '../../context/SuperAdminThemeContext';
import { cn } from '../ui/Button';

const COMMANDS = [
  { name: 'Dashboard', category: 'Navigation', path: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Schools', category: 'Navigation', path: '/super-admin/schools', icon: School },
  { name: 'Subscription', category: 'Navigation', path: '/super-admin/subscriptions', icon: CreditCard },
  { name: 'Notifications', category: 'Navigation', path: '/super-admin/notifications', icon: Bell },
  { name: 'Revenue', category: 'Navigation', path: '/super-admin/revenue', icon: DollarSign },
  { name: 'Billings', category: 'Navigation', path: '/super-admin/billing', icon: Receipt },
  { name: 'Reports', category: 'Navigation', path: '/super-admin/reports', icon: FileText },
  { name: 'Privacy & Policy', category: 'Navigation', path: '/super-admin/privacy-policy', icon: Scale },
  { name: 'Help & Support', category: 'Support', path: '/super-admin/support', icon: LifeBuoy },
  { name: 'Settings', category: 'Settings', path: '/super-admin/settings', icon: Settings },
  { name: 'Toggle Theme', category: 'Settings', icon: SunMoon, action: 'theme' },
];

export const CommandPalette = ({ open, setOpen }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { toggleTheme } = useSuperAdminTheme();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = COMMANDS.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.children[selectedIndex];
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filteredItems.length]);

  const runCommand = (item) => {
    if (!item) return;
    if (item.action === 'theme') {
      toggleTheme();
    } else if (item.path) {
      navigate(item.path);
    }
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (!filteredItems.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filteredItems[selectedIndex]);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed top-[18%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search and jump to a Super Admin page
          </DialogPrimitive.Description>

          <div className="flex items-center border-b border-slate-200 px-4 py-3 dark:border-slate-900">
            <Search className="h-5 w-5 text-slate-400 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              className="w-full bg-transparent border-0 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 text-sm h-7 dark:text-slate-200 dark:placeholder-slate-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded uppercase shrink-0 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
              ESC
            </div>
          </div>

          <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2 no-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No results found.</div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => runCommand(item)}
                    className={cn(
                      'w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/60'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={cn('h-4 w-4 shrink-0', isSelected ? 'text-white' : 'text-indigo-500 dark:text-indigo-400')} />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-100 uppercase">
                        Open
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded font-bold uppercase dark:text-slate-500 dark:border-slate-800 dark:bg-transparent">
                        {item.category}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] font-semibold text-slate-400 dark:border-slate-900 dark:bg-slate-950/80 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
              <span>Use arrow keys to navigate</span>
            </div>
            <div className="flex items-center gap-3 uppercase tracking-wide">
              <span>↑↓ Navigate</span>
              <span>↵ Enter</span>
              <span>Esc Close</span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
