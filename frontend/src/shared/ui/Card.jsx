import React from 'react';
import { cn } from '../lib/cn';

// Canonical merged Card — superset of student (`hoverEffect` prop, default
// true) and teacher/parent (hover style gated on `onClick` instead).
// Both are honored: `hoverEffect` defaults to true and can be turned off
// explicitly; `onClick` additionally adds pointer/active-press affordance.
export const Card = ({ children, className, onClick, hoverEffect = true, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border text-card-foreground rounded-2xl p-5 shadow-card transition-all duration-200",
        hoverEffect && "hover:shadow-premium hover:-translate-y-0.5",
        onClick && "cursor-pointer hover:border-primary/20 active:scale-[0.99]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
