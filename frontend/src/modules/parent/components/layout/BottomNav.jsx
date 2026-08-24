import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_TABS } from '../../utils/constants';
import { cn } from '../../utils/cn';

export const BottomNav = () => {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border py-2 px-2 flex items-center justify-around z-50 shadow-lg">
      {MOBILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname.startsWith(tab.path);

        return (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 select-none flex-1",
              isActive
                ? "text-primary dark:text-primary scale-105"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
            <span className="text-[10px] font-medium tracking-wide">{tab.name}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
