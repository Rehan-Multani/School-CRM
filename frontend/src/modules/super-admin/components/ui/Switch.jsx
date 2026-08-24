import React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from './Button';

export const Switch = React.forwardRef(({ className, label, description, ...props }, ref) => {
  return (
    <div className="flex items-center justify-between space-x-2">
      {(label || description) && (
        <div className="flex flex-col space-y-0.5">
          {label && <label className="text-sm font-medium text-slate-200">{label}</label>}
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      )}
      <SwitchPrimitive.Root
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-800',
          className
        )}
        ref={ref}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
});
