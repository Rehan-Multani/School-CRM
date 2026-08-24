import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from './Button';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-start rounded-lg bg-slate-100 dark:bg-slate-950/80 p-1 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800/60',
      className
    )}
    {...props}
  />
));

export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 text-slate-600 dark:text-slate-400 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));

export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));
